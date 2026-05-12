import fetch from 'node-fetch';
import { config } from './config';
import { logger } from './logger';

let cachedTenantId: string | null = null;

export interface GatewayResponse<T = unknown> {
  ok: boolean;
  status: number;
  data: T;
}

/**
 * Authenticates the agent with the portal gateway.
 * Sends the API key in the Authorization header and verifies the response.
 * Returns the tenant_id associated with this agent.
 */
export async function authenticate(): Promise<string> {
  logger.info('Authenticating with agent-gateway');

  const res = await fetch(`${config.gatewayUrl}?action=heartbeat`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.supabaseAnonKey}`,
      'X-Agent-Key': config.agentApiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ timestamp: new Date().toISOString() }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Authentication failed (HTTP ${res.status}): ${body}`);
  }

  const data = (await res.json()) as { tenant_id?: string; tenantId?: string };
  const tid = data.tenant_id || data.tenantId;
  if (!tid) {
    throw new Error('Authentication response missing tenant_id');
  }

  cachedTenantId = tid;
  logger.info('Authenticated successfully', { tenantId: cachedTenantId });
  return cachedTenantId;
}

/**
 * Returns the cached tenant_id from the last successful authentication.
 */
export function getTenantId(): string {
  if (!cachedTenantId) {
    throw new Error('Agent is not authenticated. Call authenticate() first.');
  }
  return cachedTenantId;
}

/**
 * Makes an authenticated request to the agent-gateway.
 */
export async function gatewayRequest<T = unknown>(
  action: string,
  body: unknown
): Promise<GatewayResponse<T>> {
  const url = `${config.gatewayUrl}?action=${encodeURIComponent(action)}`;

  logger.debug('Gateway request', { action, url });

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.supabaseAnonKey}`,
      'X-Agent-Key': config.agentApiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = (await res.json()) as T;

  if (!res.ok) {
    logger.error('Gateway request failed', {
      action,
      status: res.status,
      data: data as unknown as Record<string, unknown>,
    });
  }

  return { ok: res.ok, status: res.status, data };
}
