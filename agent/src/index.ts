import { config } from './config';
import { logger } from './logger';
import { authenticate } from './auth';
import { startPollLoop } from './poller';
import { executeJobs } from './executor';
import { syncAllSchemas } from './schema-sync';

async function main(): Promise<void> {
  logger.info('Portal Dashboard Agent starting', {
    supabaseUrl: config.supabaseUrl,
    pollIntervalMs: config.pollIntervalMs,
  });

  // Step 1: Authenticate (heartbeat) with the gateway
  const tenantId = await authenticate();
  logger.info('Agent registered', { tenantId });

  // Step 2: Initial schema sync
  logger.info('Running initial schema sync');
  try {
    await syncAllSchemas();
  } catch (err) {
    logger.error('Initial schema sync failed (non-fatal)', {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // Step 3: Start poll loop
  logger.info('Starting poll loop', { intervalMs: config.pollIntervalMs });
  const poller = startPollLoop(async (jobs) => {
    await executeJobs(jobs);
  });

  // Step 4: Graceful shutdown
  const shutdown = async (signal: string): Promise<void> => {
    logger.info('Received shutdown signal', { signal });
    poller.stop();

    // Allow in-flight requests a moment to complete
    await new Promise((resolve) => setTimeout(resolve, 2000));

    logger.info('Agent shut down gracefully');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  logger.info('Agent is running. Press Ctrl+C to stop.');
}

main().catch((err) => {
  logger.error('Fatal error during startup', {
    error: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
  });
  process.exit(1);
});
