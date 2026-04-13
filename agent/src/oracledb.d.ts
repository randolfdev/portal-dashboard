declare module 'oracledb' {
  interface Connection {
    execute<T = any>(sql: string, params?: any, options?: any): Promise<{
      rows?: T[];
      metaData?: Array<{ name: string; dbType?: number }>;
    }>;
    close(): Promise<void>;
  }

  type BindParameters = any;

  interface OracleDb {
    getConnection(config: {
      user: string;
      password: string;
      connectString: string;
    }): Promise<Connection>;
    initOracleClient?(): void;
    OUT_FORMAT_OBJECT: number;
    DB_TYPE_VARCHAR: number;
    DB_TYPE_NVARCHAR: number;
    DB_TYPE_CHAR: number;
    DB_TYPE_NCHAR: number;
    DB_TYPE_NUMBER: number;
    DB_TYPE_BINARY_FLOAT: number;
    DB_TYPE_BINARY_DOUBLE: number;
    DB_TYPE_DATE: number;
    DB_TYPE_TIMESTAMP: number;
    DB_TYPE_TIMESTAMP_TZ: number;
    DB_TYPE_TIMESTAMP_LTZ: number;
    DB_TYPE_CLOB: number;
    DB_TYPE_NCLOB: number;
    DB_TYPE_BLOB: number;
    DB_TYPE_RAW: number;
    DB_TYPE_LONG: number;
    DB_TYPE_LONG_RAW: number;
    DB_TYPE_ROWID: number;
  }

  const oracledb: OracleDb;
  export default oracledb;
  export { Connection, BindParameters };
}
