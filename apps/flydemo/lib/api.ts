'use client';

export interface ApiError {
  error: string;
  message: string;
  reason?: string;
  connectUrl?: string;
  retryAfterSec?: number;
}

export type ApiResult<T> = { ok: true; data: T } | { ok: false; status: number; error: ApiError };

/**
 * fetch wrapper used by every page. When the AgentGate gateway answers with an
 * `agent_*` error (401/403/429), it is broadcast so <AgentGateBanner> can show it.
 */
export async function apiFetch<T>(url: string, init?: RequestInit): Promise<ApiResult<T>> {
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
    });
  } catch {
    return { ok: false, status: 0, error: { error: 'network_error', message: 'Network error. Please try again.' } };
  }
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  if (res.ok) return { ok: true, data: body as T };
  const err: ApiError =
    body && typeof (body as ApiError).error === 'string'
      ? (body as ApiError)
      : { error: 'http_error', message: `Request failed (${res.status})` };
  if (err.error.startsWith('agent_')) {
    window.dispatchEvent(new CustomEvent<ApiError>('agentgate:error', { detail: err }));
  }
  return { ok: false, status: res.status, error: err };
}
