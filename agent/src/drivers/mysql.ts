import { DbDriver, ConnectorConfig, ColumnMeta, SchemaInfo } from './base';

export class MySqlDriver implements DbDriver {
  async connect(_config: ConnectorConfig): Promise<void> {
    throw new Error('MySQL driver not implemented yet');
  }

  async execute(
    _sql: string,
    _params?: unknown[]
  ): Promise<{ columns: ColumnMeta[]; rows: Record<string, unknown>[] }> {
    throw new Error('MySQL driver not implemented yet');
  }

  async getSchema(): Promise<SchemaInfo[]> {
    throw new Error('MySQL driver not implemented yet');
  }

  async disconnect(): Promise<void> {
    throw new Error('MySQL driver not implemented yet');
  }
}
