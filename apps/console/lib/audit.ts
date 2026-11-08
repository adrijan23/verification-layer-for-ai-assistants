import { GENESIS_HASH, computeAuditHash, verifyChain, type AuditDecision, type AuditRow } from '@agentgate/shared';
import { publish } from './bus';
import { getDb } from './db';
import { nowIso } from './ids';

export interface AuditEventDTO extends AuditRow {
  agentName: string | null;
}

interface DbRow {
  seq: number;
  ts: string;
  platform_id: string;
  agent_session_id: string | null;
  grant_id: string | null;
  agent_name: string | null;
  action: string;
  params_json: string;
  decision: string;
  reason: string;
  message: string;
  enforced: number;
  prev_hash: string;
  hash: string;
}

function toDTO(r: DbRow): AuditEventDTO {
  return {
    seq: r.seq,
    ts: r.ts,
    platformId: r.platform_id,
    agentSessionId: r.agent_session_id,
    grantId: r.grant_id,
    agentName: r.agent_name,
    action: r.action,
    params: JSON.parse(r.params_json),
    decision: r.decision,
    reason: r.reason,
    message: r.message,
    enforced: r.enforced === 1,
    prevHash: r.prev_hash,
    hash: r.hash,
  };
}

export interface AppendInput {
  platformId: string;
  agentSessionId?: string | null;
  grantId?: string | null;
  agentName?: string | null;
  action: string;
  params?: Record<string, unknown>;
  decision: AuditDecision;
  reason: string;
  message: string;
  enforced?: boolean;
}

/** Append one event to the hash-chained audit log (atomic: read head + insert in one transaction). */
export function appendAudit(input: AppendInput): AuditEventDTO {
  const db = getDb();
  const insert = db.transaction((): AuditEventDTO => {
    const last = db.prepare('SELECT seq, hash FROM audit_events ORDER BY seq DESC LIMIT 1').get() as
      | { seq: number; hash: string }
      | undefined;
    const payload = {
      seq: (last?.seq ?? 0) + 1,
      ts: nowIso(),
      platformId: input.platformId,
      agentSessionId: input.agentSessionId ?? null,
      grantId: input.grantId ?? null,
      action: input.action,
      params: input.params ?? {},
      decision: input.decision,
      reason: input.reason,
      message: input.message,
      enforced: input.enforced ?? true,
    };
    const prevHash = last?.hash ?? GENESIS_HASH;
    const hash = computeAuditHash(prevHash, payload);
    db.prepare(
      `INSERT INTO audit_events (seq, ts, platform_id, agent_session_id, grant_id, agent_name, action, params_json,
         decision, reason, message, enforced, prev_hash, hash)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      payload.seq,
      payload.ts,
      payload.platformId,
      payload.agentSessionId,
      payload.grantId,
      input.agentName ?? null,
      payload.action,
      JSON.stringify(payload.params),
      payload.decision,
      payload.reason,
      payload.message,
      payload.enforced ? 1 : 0,
      prevHash,
      hash,
    );
    return { ...payload, prevHash, hash, agentName: input.agentName ?? null };
  });
  const row = insert.immediate();
  publish({ type: 'audit', event: row });
  return row;
}

export function listAudit(opts: { platformId?: string; limit?: number; beforeSeq?: number } = {}): AuditEventDTO[] {
  const limit = Math.min(opts.limit ?? 50, 500);
  const where: string[] = [];
  const args: unknown[] = [];
  if (opts.platformId) {
    where.push('platform_id = ?');
    args.push(opts.platformId);
  }
  if (opts.beforeSeq) {
    where.push('seq < ?');
    args.push(opts.beforeSeq);
  }
  const rows = getDb()
    .prepare(`SELECT * FROM audit_events ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY seq DESC LIMIT ?`)
    .all(...args, limit) as DbRow[];
  return rows.map(toDTO);
}

export function verifyAuditChain() {
  const rows = (getDb().prepare('SELECT * FROM audit_events ORDER BY seq ASC').all() as DbRow[]).map(toDTO);
  return verifyChain(rows);
}
