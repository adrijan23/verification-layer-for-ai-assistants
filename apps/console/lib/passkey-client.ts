'use client';

import { startAuthentication, startRegistration } from '@simplewebauthn/browser';

export type Subject = { ticket?: string; confirmationId?: string };

async function post<T = any>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.message || `Request failed (${res.status})`);
  return json as T;
}

/**
 * Run the passkey ceremony and return a one-time assertion token.
 * First use registers a passkey (one prompt); afterwards it authenticates (one prompt).
 */
export async function approveWithPasskey(subject: Subject, email: string, opts: { forceRegister?: boolean } = {}): Promise<string> {
  const status = await fetch(`/api/webauthn/status?email=${encodeURIComponent(email)}`).then((r) => r.json());
  if (!status.hasPasskey || opts.forceRegister) {
    const o = await post<{ challengeId: string; options: any }>('/api/webauthn/register/options', subject);
    const att = await startRegistration({ optionsJSON: o.options });
    const v = await post<{ token: string }>('/api/webauthn/register/verify', { challengeId: o.challengeId, response: att });
    return v.token;
  }
  const o = await post<{ challengeId: string; options: any }>('/api/webauthn/auth/options', subject);
  const asr = await startAuthentication({ optionsJSON: o.options });
  const v = await post<{ token: string }>('/api/webauthn/auth/verify', { challengeId: o.challengeId, response: asr });
  return v.token;
}

export async function approveWithFallback(subject: Subject): Promise<string> {
  const v = await post<{ token: string }>('/api/webauthn/fallback', subject);
  return v.token;
}

export function passkeyErrorMessage(e: unknown): string {
  const err = e as Error & { name?: string };
  if (err?.name === 'NotAllowedError') return 'Passkey prompt was cancelled or timed out.';
  if (err?.name === 'InvalidStateError') return 'This device already has a passkey for this account.';
  return err?.message || 'Passkey failed. Try again.';
}
