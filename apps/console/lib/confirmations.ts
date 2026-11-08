import { formatMoney, formatPoints, actionLabel, type PlatformConfig } from '@agentgate/shared';
import { appendAudit } from './audit';
import { publish, subscribe } from './bus';
import { getDb } from './db';
import { newId, nowIso } from './ids';
import { addPhoneMessage, publishConfirmationUpdate } from './phone';

export type ConfirmationStatus = 'pending' | 'approved' | 'denied' | 'expired';

export const CONFIRMATION_TIMEOUT_MS = 90_000;

export interface ConfirmationRow {
  id: string;
  grantId: string;
  agentSessionId: string;
  platformId: string;
  action: string;
  params: Record<string, unknown>;
  status: ConfirmationStatus;
  createdAt: string;
  decidedAt: string | null;
}

export function getConfirmation(id: string): ConfirmationRow | undefined {
  const r = getDb().prepare('SELECT * FROM confirmations WHERE id = ?').get(id) as any;
  return (
    r && {
      id: r.id,
      grantId: r.grant_id,
      agentSessionId: r.agent_session_id,
      platformId: r.platform_id,
      action: r.action,
      params: JSON.parse(r.params_json),
      status: r.status,
      createdAt: r.created_at,
      decidedAt: r.decided_at,
    }
  );
}

/** Human title + body for the approval card on the phone. */
export function describeApproval(cfg: PlatformConfig, action: string, params: Record<string, unknown>, agentName: string, why: string) {
  const amount = typeof params.amount === 'number' ? formatMoney(params.amount, String(params.currency ?? 'EUR')) : null;
  const refund = typeof params.refundAmount === 'number' ? formatMoney(params.refundAmount) : null;
  const points = typeof params.points === 'number' ? formatPoints(params.points) : null;
  const where = cfg.displayName;
  switch (action) {
    case 'flight.book':
      return {
        title: `Approve ${amount} payment at ${where}?`,
        body: `${agentName} wants to buy a ${params.fareClass === 'business' ? 'business-class' : 'economy'} ticket${params.flightId ? ` on ${params.flightId}` : ''}. ${why}`,
      };
    case 'miles.redeem':
      return { title: `Spend ${points} at ${where}?`, body: `${agentName} wants to pay for a ticket with your miles. ${why}` };
    case 'booking.cancel':
      return { title: `Cancel a trip on ${where}?`, body: `${agentName} wants to cancel a booking${refund ? ` and request a ${refund} refund` : ''}.` };
    case 'order.place':
      return { title: `Approve ${amount} order at ${where}?`, body: `${agentName} wants to place an order. ${why}` };
    case 'order.return':
      return { title: `Return an order on ${where}?`, body: `${agentName} wants to return items${refund ? ` for a ${refund} refund` : ''}.` };
    default:
      return { title: `Approve: ${actionLabel(cfg, action)}?`, body: `${agentName} is asking for permission on ${where}. ${why}` };
  }
}

export function createConfirmation(input: {
  cfg: PlatformConfig;
  grantId: string;
  sid: string;
  action: string;
  params: Record<string, unknown>;
  userEmail: string;
  agentName: string;
  why: string;
}): string {
  const id = newId('cf');
  getDb()
    .prepare(
      `INSERT INTO confirmations (id, grant_id, agent_session_id, platform_id, action, params_json, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`,
    )
    .run(id, input.grantId, input.sid, input.cfg.platformId, input.action, JSON.stringify(input.params), nowIso());
  const { title, body } = describeApproval(input.cfg, input.action, input.params, input.agentName, input.why);
  addPhoneMessage({
    userEmail: input.userEmail,
    platformId: input.cfg.platformId,
    sender: input.cfg.displayName,
    kind: 'approval',
    title,
    body,
    confirmationId: id,
  });
  return id;
}

/** Resolve a pending confirmation (approve / deny / expire). Returns false if it was no longer pending. */
export function resolveConfirmation(id: string, status: Exclude<ConfirmationStatus, 'pending'>, method?: string): boolean {
  const c = getConfirmation(id);
  if (!c || c.status !== 'pending') return false;
  const res = getDb()
    .prepare(`UPDATE confirmations SET status = ?, decided_at = ? WHERE id = ? AND status = 'pending'`)
    .run(status, nowIso(), id);
  if (res.changes === 0) return false;
  const session = getDb().prepare('SELECT agent_name FROM agent_sessions WHERE id = ?').get(c.agentSessionId) as
    | { agent_name: string }
    | undefined;
  appendAudit({
    platformId: c.platformId,
    agentSessionId: c.agentSessionId,
    grantId: c.grantId,
    agentName: session?.agent_name,
    action: c.action,
    params: { ...c.params, confirmationId: id, ...(method ? { method } : {}) },
    decision: status === 'approved' ? 'approved' : status === 'denied' ? 'denied_by_user' : 'expired',
    reason: status === 'approved' ? 'user_approved' : status === 'denied' ? 'user_denied' : 'confirmation_timeout',
    message:
      status === 'approved'
        ? `Approved on the user’s phone${method === 'passkey' ? ' with a passkey' : ''}.`
        : status === 'denied'
          ? 'Declined by the user on their phone.'
          : 'No answer from the user within 90 seconds.',
  });
  publish({ type: 'confirmation', id, status });
  publishConfirmationUpdate(id);
  return true;
}

/** Long-poll helper: resolves when the confirmation leaves 'pending' or the timeout expires it. */
export function waitForConfirmation(id: string, maxWaitMs = CONFIRMATION_TIMEOUT_MS): Promise<ConfirmationStatus> {
  return new Promise((resolve) => {
    const c = getConfirmation(id);
    if (!c) return resolve('expired');
    if (c.status !== 'pending') return resolve(c.status);
    const remaining = Math.max(0, new Date(c.createdAt).getTime() + CONFIRMATION_TIMEOUT_MS - Date.now());
    let done = false;
    const finish = (s: ConfirmationStatus) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      unsub();
      resolve(s);
    };
    const unsub = subscribe((e) => {
      if (e.type === 'confirmation' && e.id === id) finish(e.status as ConfirmationStatus);
    });
    const timer = setTimeout(() => {
      resolveConfirmation(id, 'expired');
      finish(getConfirmation(id)?.status ?? 'expired');
    }, Math.min(remaining, maxWaitMs));
  });
}
