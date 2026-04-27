import oracledb, { Connection, BindParameters } from 'oracledb';
import { DbDriver, ConnectorConfig, ColumnMeta, SchemaInfo } from './base';
import { logger } from '../logger';

export class OracleDriver implements DbDriver {
  private connection: Connection | null = null;
  private schema: string = '';

  async connect(cfg: ConnectorConfig): Promise<void> {
    const connectString =
      (cfg.extra.connectString as string) ||
      `(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=${cfg.host})(PORT=${cfg.port}))(CONNECT_DATA=(SERVICE_NAME=${cfg.database})))`;

    logger.info('Connecting to Oracle', { connectString, user: cfg.username });

    // Prefer thin mode (no Oracle client needed) when available
    try {
      oracledb.initOracleClient?.();
    } catch {
      // Thin mode is fine
    }

    this.connection = await oracledb.getConnection({
      user: cfg.username,
      password: cfg.password,
      connectString,
    });

    // Resolve the current schema name
    const result = await this.connection.execute<[string]>(
      'SELECT SYS_CONTEXT(\'USERENV\', \'CURRENT_SCHEMA\') FROM DUAL'
    );
    this.schema = result.rows?.[0]?.[0] ?? cfg.username.toUpperCase();

    logger.info('Connected to Oracle', { schema: this.schema });
  }

  async execute(
    sql: string,
    params: unknown[] = []
  ): Promise<{ columns: ColumnMeta[]; rows: Record<string, unknown>[] }> {
    if (!this.connection) {
      throw new Error('Oracle driver is not connected');
    }

    logger.debug('Executing query', { sql, paramCount: params.length });

    const result = await this.connection.execute(sql, params as BindParameters, {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
      maxRows: 50_000,
    });

    const columns: ColumnMeta[] = (result.metaData ?? []).map((col: any) => ({
      name: col.name.toLowerCase(),
      type: mapOracleDbType(col.dbType),
    }));

    const rawRows = (result.rows ?? []) as Record<string, unknown>[];
    const rows = rawRows.map((row) => {
      const normalized: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(row)) normalized[k.toLowerCase()] = v;
      return normalized;
    });

    logger.debug('Query returned', { rowCount: rows.length, columnCount: columns.length });

    return { columns, rows };
  }

  async getSchema(): Promise<SchemaInfo[]> {
    if (!this.connection) {
      throw new Error('Oracle driver is not connected');
    }

    logger.info('Fetching schema dictionary', { schema: this.schema });

    // Fetch all columns for the connected user's schema
    const colResult = await this.connection.execute<Record<string, unknown>>(
      `SELECT
         atc.OWNER        AS "schema",
         atc.TABLE_NAME   AS "table",
         atc.COLUMN_NAME  AS "column",
         atc.DATA_TYPE    AS "type",
         atc.NULLABLE     AS "nullable"
       FROM ALL_TAB_COLUMNS atc
       WHERE atc.OWNER = :owner
       ORDER BY atc.TABLE_NAME, atc.COLUMN_ID`,
      [this.schema],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    // Fetch primary key columns
    const pkResult = await this.connection.execute<Record<string, unknown>>(
      `SELECT
         acc.OWNER        AS "schema",
         acc.TABLE_NAME   AS "table",
         acc.COLUMN_NAME  AS "column"
       FROM ALL_CONSTRAINTS ac
       JOIN ALL_CONS_COLUMNS acc
         ON ac.CONSTRAINT_NAME = acc.CONSTRAINT_NAME
        AND ac.OWNER = acc.OWNER
       WHERE ac.CONSTRAINT_TYPE = 'P'
         AND ac.OWNER = :owner`,
      [this.schema],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const pkSet = new Set<string>();
    for (const row of (pkResult.rows ?? []) as Record<string, string>[]) {
      pkSet.add(`${row.schema}.${row.table}.${row.column}`);
    }

    // Group columns by table
    const tableMap = new Map<string, SchemaInfo>();

    for (const row of (colResult.rows ?? []) as Record<string, string>[]) {
      const tableKey = `${row.schema}.${row.table}`;
      if (!tableMap.has(tableKey)) {
        tableMap.set(tableKey, {
          schema: row.schema,
          table: row.table,
          columns: [],
        });
      }

      const colKey = `${row.schema}.${row.table}.${row.column}`;
      tableMap.get(tableKey)!.columns.push({
        name: row.column,
        type: row.type,
        nullable: row.nullable === 'Y',
        primaryKey: pkSet.has(colKey),
      });
    }

    const schemas = Array.from(tableMap.values());
    logger.info('Schema dictionary fetched', { tableCount: schemas.length });
    return schemas;
  }

  async disconnect(): Promise<void> {
    if (this.connection) {
      logger.info('Disconnecting from Oracle');
      await this.connection.close();
      this.connection = null;
    }
  }
}

function mapOracleDbType(dbType: number | undefined): string {
  if (dbType === undefined) return 'UNKNOWN';

  const typeMap: Record<number, string> = {
    [oracledb.DB_TYPE_VARCHAR.num]: 'VARCHAR2',
    [oracledb.DB_TYPE_NVARCHAR.num]: 'NVARCHAR2',
    [oracledb.DB_TYPE_CHAR.num]: 'CHAR',
    [oracledb.DB_TYPE_NCHAR.num]: 'NCHAR',
    [oracledb.DB_TYPE_NUMBER.num]: 'NUMBER',
    [oracledb.DB_TYPE_BINARY_FLOAT.num]: 'BINARY_FLOAT',
    [oracledb.DB_TYPE_BINARY_DOUBLE.num]: 'BINARY_DOUBLE',
    [oracledb.DB_TYPE_DATE.num]: 'DATE',
    [oracledb.DB_TYPE_TIMESTAMP.num]: 'TIMESTAMP',
    [oracledb.DB_TYPE_TIMESTAMP_TZ.num]: 'TIMESTAMP WITH TIME ZONE',
    [oracledb.DB_TYPE_TIMESTAMP_LTZ.num]: 'TIMESTAMP WITH LOCAL TIME ZONE',
    [oracledb.DB_TYPE_CLOB.num]: 'CLOB',
    [oracledb.DB_TYPE_NCLOB.num]: 'NCLOB',
    [oracledb.DB_TYPE_BLOB.num]: 'BLOB',
    [oracledb.DB_TYPE_RAW.num]: 'RAW',
    [oracledb.DB_TYPE_LONG.num]: 'LONG',
    [oracledb.DB_TYPE_LONG_RAW.num]: 'LONG RAW',
    [oracledb.DB_TYPE_ROWID.num]: 'ROWID',
  };

  return typeMap[dbType] ?? `ORACLE_TYPE_${dbType}`;
}
