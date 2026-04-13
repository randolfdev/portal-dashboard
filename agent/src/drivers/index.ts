import { DbDriver } from './base';
import { OracleDriver } from './oracle';
import { MySqlDriver } from './mysql';
import { PostgresDriver } from './postgres';
import { SqlServerDriver } from './sqlserver';

export type DbType = 'oracle' | 'mysql' | 'postgres' | 'sqlserver';

const DRIVER_MAP: Record<DbType, new () => DbDriver> = {
  oracle: OracleDriver,
  mysql: MySqlDriver,
  postgres: PostgresDriver,
  sqlserver: SqlServerDriver,
};

export function getDriver(dbType: string): DbDriver {
  const normalised = dbType.toLowerCase() as DbType;
  const DriverClass = DRIVER_MAP[normalised];
  if (!DriverClass) {
    throw new Error(`Unsupported database type: ${dbType}. Supported: ${Object.keys(DRIVER_MAP).join(', ')}`);
  }
  return new DriverClass();
}

export { DbDriver, ConnectorConfig, ColumnMeta, SchemaInfo } from './base';
