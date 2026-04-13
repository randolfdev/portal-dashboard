export type ConnectorConfig = {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  extra: Record<string, unknown>;
};

export type ColumnMeta = {
  name: string;
  type: string;
};

export type SchemaInfo = {
  schema: string;
  table: string;
  columns: {
    name: string;
    type: string;
    nullable: boolean;
    primaryKey: boolean;
  }[];
};

export interface DbDriver {
  connect(config: ConnectorConfig): Promise<void>;
  execute(
    sql: string,
    params?: unknown[]
  ): Promise<{ columns: ColumnMeta[]; rows: Record<string, unknown>[] }>;
  getSchema(): Promise<SchemaInfo[]>;
  disconnect(): Promise<void>;
}
