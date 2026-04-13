import { logger } from './logger';
import { gatewayRequest } from './auth';
import { getDriver, ConnectorConfig, SchemaInfo } from './drivers/index';
import { decryptPassword } from './crypto';

export type ConnectorDescriptor = {
  id: string;
  db_type: string;
  config: ConnectorConfig;
};

type SyncSchemaRequest = {
  connector_id: string;
  schema: SchemaInfo[];
  synced_at: string;
};

/**
 * Fetches the list of connectors assigned to this agent from the gateway,
 * then introspects each database and pushes the schema dictionary back.
 */
export async function syncAllSchemas(): Promise<void> {
  logger.info('Starting schema sync for all connectors');

  // Fetch connectors from the gateway
  const response = await gatewayRequest<{ connectors: ConnectorDescriptor[] }>(
    'list-connectors',
    { timestamp: new Date().toISOString() }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch connectors: HTTP ${response.status}`);
  }

  const connectors = response.data.connectors ?? [];
  logger.info('Connectors to sync', { count: connectors.length });

  for (const connector of connectors) {
    await syncConnectorSchema(connector);
  }

  logger.info('Schema sync complete');
}

/**
 * Syncs schema for a single connector.
 */
async function syncConnectorSchema(connector: ConnectorDescriptor): Promise<void> {
  const driver = getDriver(connector.db_type);

  try {
    logger.info('Syncing schema for connector', {
      connectorId: connector.id,
      dbType: connector.db_type,
    });

    // Decrypt the password before connecting
    const cfg: ConnectorConfig = {
      ...connector.config,
      password: decryptPassword(connector.config.password),
    };

    await driver.connect(cfg);
    const schema = await driver.getSchema();

    const payload: SyncSchemaRequest = {
      connector_id: connector.id,
      schema,
      synced_at: new Date().toISOString(),
    };

    const syncResponse = await gatewayRequest('sync-schema', payload);
    if (!syncResponse.ok) {
      logger.error('Failed to push schema to gateway', {
        connectorId: connector.id,
        status: syncResponse.status,
      });
    } else {
      logger.info('Schema synced successfully', {
        connectorId: connector.id,
        tableCount: schema.length,
      });
    }
  } catch (err) {
    logger.error('Schema sync failed for connector', {
      connectorId: connector.id,
      error: err instanceof Error ? err.message : String(err),
    });
  } finally {
    await driver.disconnect().catch((e) => {
      logger.warn('Error disconnecting after schema sync', {
        connectorId: connector.id,
        error: e instanceof Error ? e.message : String(e),
      });
    });
  }
}
