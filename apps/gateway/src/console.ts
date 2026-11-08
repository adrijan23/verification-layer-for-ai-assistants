import type { DecideResponse } from '@agentgate/shared';
import { env } from './env';

const headers = { 'content-type': 'application/json', 'x-gateway-secret': env.gatewaySecret };

export interface PlatformState {
  gatewayEnabled: boolean;
  shadowMode: boolean;
}

const stateCache = new Map<string, { at: number; state: PlatformState }>();

/** Platform switches (gateway on/off, shadow mode), cached for 750 ms. */
export async function getPlatformState(platformId: string): Promise<PlatformState> {
  const hit = stateCache.get(platformId);
  if (hit && Date.now() - hit.at < 750) return hit.state;
  const res = await fetch(`${env.consoleInternalUrl}/api/platforms/${platformId}/state`, { headers });
  if (!res.ok) throw new Error(`console state ${res.status}`);
  const state = (await res.json()) as PlatformState;
  stateCache.set(platformId, { at: Date.now(), state });
  return state;
}

export async function callDecide(body: {
  platformId: string;
  sid: string;
  agentName: string;
  action: string;
  params: Record<string, unknown>;
  method: string;
  path: string;
  login: boolean;
}): Promise<DecideResponse> {
  const res = await fetch(`${env.consoleInternalUrl}/api/decide`, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`console decide ${res.status}: ${await res.text()}`);
  return (await res.json()) as DecideResponse;
}

/** Long-poll the console until the user decides (or the 90 s timeout expires the confirmation). */
export async function waitForConfirmation(id: string): Promise<'approved' | 'denied' | 'expired'> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 100_000);
  try {
    const res = await fetch(`${env.consoleInternalUrl}/api/confirmations/${id}/wait`, { headers, signal: ctrl.signal });
    if (!res.ok) return 'expired';
    const j = (await res.json()) as { status: string };
    return j.status === 'approved' ? 'approved' : j.status === 'denied' ? 'denied' : 'expired';
  } catch {
    return 'expired';
  } finally {
    clearTimeout(t);
  }
}

export function postEvent(body: Record<string, unknown>) {
  fetch(`${env.consoleInternalUrl}/api/events`, { method: 'POST', headers, body: JSON.stringify(body) }).catch((e) =>
    console.error('[gateway] event post failed', e),
  );
}
