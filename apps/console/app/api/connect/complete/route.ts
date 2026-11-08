import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { CONSENT_COOKIE, getTicket, ticketValid } from '@/lib/consent';
import { getDb } from '@/lib/db';
import { PermissionsInputSchema, createGrant, sanitizePermissions } from '@/lib/grants';
import { nowIso } from '@/lib/ids';
import { getPlatformConfig } from '@/lib/platforms';
import { consumeAssertion } from '@/lib/webauthn';

export const dynamic = 'force-dynamic';

const Body = z.object({
  ticket: z.string().max(80),
  assertionToken: z.string().max(80),
  permissions: PermissionsInputSchema,
});

/** Consent step C: passkey verified → create the grant and authorize the agent session. */
export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'bad_request', message: 'Invalid request.' }, { status: 400 });
  const { ticket, assertionToken, permissions } = parsed.data;
  if (req.cookies.get(CONSENT_COOKIE)?.value !== ticket) {
    return NextResponse.json({ error: 'csrf', message: 'Session check failed. Reload the page and try again.' }, { status: 403 });
  }
  const t = getTicket(ticket);
  if (!ticketValid(t)) return NextResponse.json({ error: 'expired', message: 'This approval expired. Start again.' }, { status: 410 });
  const method = consumeAssertion(assertionToken, t.email);
  if (!method) return NextResponse.json({ error: 'passkey_required', message: 'Passkey confirmation is required.' }, { status: 401 });
  const cfg = getPlatformConfig(t.platformId)!;
  const grantId = createGrant({
    cfg,
    sid: t.sid,
    platformUserId: t.platformUserId,
    permissions: sanitizePermissions(cfg, permissions),
    method,
  });
  getDb().prepare('UPDATE consent_tickets SET used_at = ? WHERE id = ?').run(nowIso(), ticket);
  const res = NextResponse.json({ ok: true, grantId });
  res.cookies.delete(CONSENT_COOKIE);
  return res;
}
