import { logger } from './logger';
import { gatewayRequest } from './auth';
import { getDriver, ConnectorConfig, ColumnMeta } from './drivers/index';
import { getCompiler, QueryAST } from './query-compiler/index';
import { decryptPassword } from './crypto';
import { Job } from './poller';

type JobResult = {
  job_id: string;
  status: 'completed' | 'failed';
  columns?: ColumnMeta[];
  rows?: Record<string, unknown>[];
  row_count?: number;
  error?: string;
  started_at: string;
  finished_at: string;
};

/**
 * Executes a single job:
 *  1. Resolves the database driver for the db_type
 *  2. Compiles the query_ast to SQL for the target dialect
 *  3. Connects and runs the query
 *  4. Posts results (or error) back to the gateway
 */
export async function executeJob(job: Job): Promise<void> {
  const startedAt = new Date().toISOString();

  logger.info('Executing job', { jobId: job.id, dbType: job.db_type });

  const driver = getDriver(job.db_type);

  try {
    // Compile the query AST to SQL
    const compiler = getCompiler(job.db_type);
    const { sql, params } = compiler.compile(job.query_ast);

    logger.debug('Compiled SQL', { jobId: job.id, sql, paramCount: params.length });

    // Decrypt the connector password (fall back to env override or plaintext)
    let password: string;
    try {
      password = decryptPassword(job.connector_config.password);
    } catch {
      // If decryption fails, use ORACLE_PASSWORD env var or the raw value
      password = process.env.ORACLE_PASSWORD || job.connector_config.password;
      logger.warn('Password decryption failed, using fallback', { jobId: job.id });
    }

    const cfg: ConnectorConfig = {
      ...job.connector_config,
      password,
    };

    // Connect, execute, disconnect
    await driver.connect(cfg);
    const { columns, rows } = await driver.execute(sql, params);

    const finishedAt = new Date().toISOString();

    const result: JobResult = {
      job_id: job.id,
      status: 'completed',
      columns,
      rows,
      row_count: rows.length,
      started_at: startedAt,
      finished_at: finishedAt,
    };

    logger.info('Job completed', {
      jobId: job.id,
      rowCount: rows.length,
      columnCount: columns.length,
    });

    await postResult(result);
  } catch (err) {
    const finishedAt = new Date().toISOString();
    const errorMessage = err instanceof Error ? err.message : String(err);

    logger.error('Job failed', { jobId: job.id, error: errorMessage });

    const result: JobResult = {
      job_id: job.id,
      status: 'failed',
      error: errorMessage,
      started_at: startedAt,
      finished_at: finishedAt,
    };

    await postResult(result);
  } finally {
    await driver.disconnect().catch((e) => {
      logger.warn('Error disconnecting after job execution', {
        jobId: job.id,
        error: e instanceof Error ? e.message : String(e),
      });
    });
  }
}

/**
 * Executes a batch of jobs sequentially.
 */
export async function executeJobs(jobs: Job[]): Promise<void> {
  for (const job of jobs) {
    await executeJob(job);
  }
}

/**
 * Posts a job result back to the gateway.
 */
async function postResult(result: JobResult): Promise<void> {
  try {
    const action = result.status === 'failed' ? 'fail-job' : 'complete-job';
    const body = result.status === 'failed'
      ? { jobId: result.job_id, errorMessage: result.error }
      : { jobId: result.job_id, data: result.rows, metadata: { rowCount: result.row_count, columns: result.columns } };
    const response = await gatewayRequest(action, body);
    if (!response.ok) {
      logger.error('Failed to post job result', {
        jobId: result.job_id,
        status: response.status,
      });
    }
  } catch (err) {
    logger.error('Error posting job result', {
      jobId: result.job_id,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
