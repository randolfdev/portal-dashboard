import { QueryAST, CompiledQuery, QueryCompiler } from './index';

export class OracleDialect implements QueryCompiler {
  compile(ast: QueryAST): CompiledQuery {
    const params: unknown[] = [];
    let paramIndex = 0;

    const nextParam = (value: unknown): string => {
      paramIndex++;
      params.push(value);
      return `:p${paramIndex}`;
    };

    // Don't quote simple identifiers — Oracle treats quoted names as case-sensitive
    // which breaks when the DB objects are stored in uppercase (default).
    // Only quote if the name contains special characters that require it.
    const needsQuote = (name: string): boolean =>
      /[^a-zA-Z0-9_.]/.test(name) || /^\d/.test(name);

    const ident = (name: string): string => {
      // Already qualified (e.g. "v.ds_convenio") — pass through as-is
      if (name.includes('.')) return name;
      return needsQuote(name) ? `"${name}"` : name;
    };

    const qualifiedTable = (schema: string, table: string, alias: string): string => {
      const parts: string[] = [];
      if (schema) parts.push(`${ident(schema)}.${ident(table)}`);
      else parts.push(ident(table));
      if (alias) parts.push(ident(alias));
      return parts.join(' ');
    };

    // --- SELECT clause ---
    const selectExprs = ast.columns.map((col) => {
      let expr: string;
      if (col.aggregate) {
        expr = `${col.aggregate.toUpperCase()}(${col.expression === '*' ? '*' : ident(col.expression)})`;
      } else {
        expr = ident(col.expression);
      }
      if (col.alias) {
        expr += ` AS ${ident(col.alias)}`;
      }
      return expr;
    });
    const selectClause = selectExprs.length > 0 ? selectExprs.join(', ') : '*';

    // --- FROM clause ---
    const fromClause = qualifiedTable(ast.source.schema, ast.source.table, ast.source.alias);

    // --- JOIN clauses ---
    const joinClauses = ast.joins.map((join) => {
      const joinType = join.type.toUpperCase();
      const table = qualifiedTable(join.schema, join.table, join.alias);
      const onClause = `${ident(join.on.left)} ${join.on.operator} ${ident(join.on.right)}`;
      return `${joinType} JOIN ${table} ON ${onClause}`;
    });

    // --- WHERE clause ---
    const whereFragments: string[] = [];
    for (let i = 0; i < ast.filters.length; i++) {
      const filter = ast.filters[i];
      const paramPlaceholder = buildFilterExpression(filter, ident, nextParam);

      if (i > 0) {
        whereFragments.push(filter.conjunction.toUpperCase());
      }
      whereFragments.push(paramPlaceholder);
    }

    // --- GROUP BY clause ---
    const groupByClause =
      ast.groupBy.length > 0 ? 'GROUP BY ' + ast.groupBy.map(ident).join(', ') : '';

    // --- ORDER BY clause ---
    const orderByClause =
      ast.orderBy.length > 0
        ? 'ORDER BY ' +
          ast.orderBy.map((o) => `${ident(o.column)} ${o.direction.toUpperCase()}`).join(', ')
        : '';

    // --- LIMIT clause (Oracle 12c+ syntax) ---
    const limitClause =
      ast.limit !== undefined && ast.limit > 0
        ? `FETCH FIRST ${ast.limit} ROWS ONLY`
        : '';

    // --- Assemble ---
    const parts = [
      `SELECT ${selectClause}`,
      `FROM ${fromClause}`,
      ...joinClauses,
      whereFragments.length > 0 ? `WHERE ${whereFragments.join(' ')}` : '',
      groupByClause,
      orderByClause,
      limitClause,
    ].filter(Boolean);

    return {
      sql: parts.join('\n'),
      params,
    };
  }
}

function buildFilterExpression(
  filter: QueryAST['filters'][number],
  ident: (name: string) => string,
  nextParam: (value: unknown) => string
): string {
  const col = ident(filter.column);
  const op = filter.operator.toUpperCase().replace(/_/g, ' ');

  switch (op) {
    case 'IS NULL':
      return `${col} IS NULL`;
    case 'IS NOT NULL':
      return `${col} IS NOT NULL`;
    case 'IN': {
      if (!Array.isArray(filter.value)) {
        throw new Error('IN operator requires an array value');
      }
      const placeholders = filter.value.map((v) => nextParam(v)).join(', ');
      return `${col} IN (${placeholders})`;
    }
    case 'NOT IN': {
      if (!Array.isArray(filter.value)) {
        throw new Error('NOT IN operator requires an array value');
      }
      const placeholders = filter.value.map((v) => nextParam(v)).join(', ');
      return `${col} NOT IN (${placeholders})`;
    }
    case 'BETWEEN': {
      if (!Array.isArray(filter.value) || filter.value.length !== 2) {
        throw new Error('BETWEEN operator requires a two-element array value');
      }
      // Detect date strings (DD/MM/YYYY) and wrap with TO_DATE for Oracle
      const isDateStr = (v: unknown): boolean =>
        typeof v === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(v);
      if (isDateStr(filter.value[0]) && isDateStr(filter.value[1])) {
        return `${col} BETWEEN TO_DATE(${nextParam(filter.value[0])}, 'DD/MM/YYYY') AND TO_DATE(${nextParam(filter.value[1])}, 'DD/MM/YYYY')`;
      }
      return `${col} BETWEEN ${nextParam(filter.value[0])} AND ${nextParam(filter.value[1])}`;
    }
    case 'LIKE':
    case 'NOT LIKE':
      return `${col} ${op} ${nextParam(filter.value)}`;
    default:
      // Standard comparison operators: =, !=, <>, <, >, <=, >=
      return `${col} ${filter.operator} ${nextParam(filter.value)}`;
  }
}
