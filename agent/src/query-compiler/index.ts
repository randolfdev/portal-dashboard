import { OracleDialect } from './oracle-dialect';
import { MySqlDialect } from './mysql-dialect';
import { PostgresDialect } from './postgres-dialect';
import { SqlServerDialect } from './sqlserver-dialect';

export type QueryAST = {
  version: 1;
  source: { schema: string; table: string; alias: string };
  joins: Array<{
    type: 'inner' | 'left' | 'right';
    schema: string;
    table: string;
    alias: string;
    on: { left: string; operator: string; right: string };
  }>;
  columns: Array<{
    expression: string;
    alias: string;
    aggregate?: 'sum' | 'avg' | 'count' | 'min' | 'max';
  }>;
  filters: Array<{
    column: string;
    operator: string;
    value: unknown;
    conjunction: 'and' | 'or';
  }>;
  groupBy: string[];
  orderBy: Array<{ column: string; direction: 'asc' | 'desc' }>;
  limit?: number;
};

export type CompiledQuery = {
  sql: string;
  params: unknown[];
};

export interface QueryCompiler {
  compile(ast: QueryAST): CompiledQuery;
}

const COMPILER_MAP: Record<string, new () => QueryCompiler> = {
  oracle: OracleDialect,
  mysql: MySqlDialect,
  postgres: PostgresDialect,
  sqlserver: SqlServerDialect,
};

export function getCompiler(dbType: string): QueryCompiler {
  const normalised = dbType.toLowerCase();
  const CompilerClass = COMPILER_MAP[normalised];
  if (!CompilerClass) {
    throw new Error(
      `Unsupported query compiler for: ${dbType}. Supported: ${Object.keys(COMPILER_MAP).join(', ')}`
    );
  }
  return new CompilerClass();
}
