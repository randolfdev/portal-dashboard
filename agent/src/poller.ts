import { config } from './config';
import { logger } from './logger';
import { gatewayRequest } from './auth';
import { ConnectorConfig } from './drivers/base';
import { QueryAST } from './query-compiler/index';

export type Job = {
  id: string;
  connector_id: string;
  db_type: string;
  connector_config: ConnectorConfig;
  query_ast: QueryAST;
  created_at: string;
};

type PollResponse = {
  jobs: Job[];
};

/**
 * Polls the agent-gateway for pending jobs.
 * Returns a (possibly empty) array of jobs to execute.
 */
export async function pollJobs(): Promise<Job[]> {
  logger.debug('Polling for pending jobs');

  const response = await gatewayRequest<PollResponse>('poll-jobs', {
    timestamp: new Date().toISOString(),
  });

  if (!response.ok) {
    logger.warn('Poll request failed', { status: response.status });
    return [];
  }

  const jobs = response.data.jobs ?? [];
  if (jobs.length > 0) {
    logger.info('Received jobs', { count: jobs.length, jobIds: jobs.map((j) => j.id) });
  } else {
    logger.debug('No pending jobs');
  }

  return jobs;
}

/**
 * Starts the poll loop. Calls the provided handler for each batch of jobs.
 * Returns an abort function to stop polling.
 */
export function startPollLoop(
  handler: (jobs: Job[]) => Promise<void>
): { stop: () => void } {
  let running = true;
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

  const tick = async (): Promise<void> => {
    if (!running) return;

    try {
      const jobs = await pollJobs();
      if (jobs.length > 0) {
        await handler(jobs);
      }
    } catch (err) {
      logger.error('Poll loop error', {
        error: err instanceof Error ? err.message : String(err),
      });
    }

    if (running) {
      timeoutHandle = setTimeout(tick, config.pollIntervalMs);
    }
  };

  // Start the first tick
  tick();

  return {
    stop: () => {
      running = false;
      if (timeoutHandle) clearTimeout(timeoutHandle);
      logger.info('Poll loop stopped');
    },
  };
}
