import { getConfirmation } from './confirmations';
import { getDb } from './db';
import { getGrant } from './repo';

export const CONSENT_COOKIE = 'ag_consent';

export interface ConsentTicket {
  id: string;
  sid: string;
  platformId: string;
  platformUserId: string;
  email: string;
  createdAt: string;
  usedAt: string | null;
}

export function getTicket(id: string): ConsentTicket | undefined {
  const r = getDb().prepare('SELECT * FROM consent_tickets WHERE id = ?').get(id) as any;
  return (
    r && {
      id: r.id,
      sid: r.sid,
      platformId: r.platform_id,
      platformUserId: r.platform_user_id,
      email: r.email,
      createdAt: r.created_at,
      usedAt: r.used_at,
    }
  );
}

export function ticketValid(t: ConsentTicket | undefined): t is ConsentTicket {
  return !!t && !t.usedAt && Date.now() - new Date(t.createdAt).getTime() < 15 * 60_000;
}

/** The person a passkey ceremony is for: from a consent ticket, or from a pending confirmation. */
export function resolveSubject(input: { ticket?: string; confirmationId?: string }): { email: string; displayName: string } | null {
  if (input.ticket) {
    const t = getTicket(input.ticket);
    if (!ticketValid(t)) return null;
    const u = getDb().prepare('SELECT display_name FROM platform_users WHERE id = ?').get(t.platformUserId) as { display_name: string };
    return { email: t.email, displayName: u.display_name };
  }
  if (input.confirmationId) {
    const c = getConfirmation(input.confirmationId);
    const g = c && getGrant(c.grantId);
    if (!c || !g || c.status !== 'pending') return null;
    return { email: g.userEmail, displayName: g.userName };
  }
  return null;
}
