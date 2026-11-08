import { createHash } from 'node:crypto';

export const GENESIS_HASH = '0'.repeat(64);

/** Deterministic JSON: object keys sorted recursively, undefined dropped. */
export function canonicalJSON(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value ?? null);
  if (Array.isArray(value)) return `[${value.map((v) => canonicalJSON(v)).join(',')}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj)
    .filter((k) => obj[k] !== undefined)
    .sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJSON(obj[k])}`).join(',')}}`;
}

export interface AuditPayload {
  seq: number;
  ts: string;
  platformId: string;
  agentSessionId: string | null;
  grantId: string | null;
  action: string;
  params: Record<string, unknown>;
  decision: string;
  reason: string;
  message: string;
  enforced: boolean;
}

export interface AuditRow extends AuditPayload {
  prevHash: string;
  hash: string;
}

export function computeAuditHash(prevHash: string, payload: AuditPayload): string {
  const canonical = canonicalJSON({
    seq: payload.seq,
    ts: payload.ts,
    platformId: payload.platformId,
    agentSessionId: payload.agentSessionId,
    grantId: payload.grantId,
    action: payload.action,
    params: payload.params,
    decision: payload.decision,
    reason: payload.reason,
    message: payload.message,
    enforced: payload.enforced,
  });
  return createHash('sha256').update(prevHash + canonical).digest('hex');
}

export interface ChainVerification {
  ok: boolean;
  count: number;
  brokenAtSeq?: number;
  headHash?: string;
}

/** Walk the chain in seq order and recompute every hash. */
export function verifyChain(rows: AuditRow[]): ChainVerification {
  const sorted = [...rows].sort((a, b) => a.seq - b.seq);
  let prev = GENESIS_HASH;
  for (const row of sorted) {
    if (row.prevHash !== prev) return { ok: false, count: sorted.length, brokenAtSeq: row.seq };
    const expected = computeAuditHash(prev, row);
    if (expected !== row.hash) return { ok: false, count: sorted.length, brokenAtSeq: row.seq };
    prev = row.hash;
  }
  return { ok: true, count: sorted.length, headHash: prev };
}
