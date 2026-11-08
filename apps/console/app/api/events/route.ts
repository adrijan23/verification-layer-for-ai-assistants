import { NextResponse } from 'next/server';
import { z } from 'zod';
import { appendAudit } from '@/lib/audit';
import { publish } from '@/lib/bus';
import { getDb } from '@/lib/db';
import { requireGateway } from '@/lib/gatewayAuth';
import { nowIso } from '@/lib/ids';

export const dynamic = 'force-dynamic';

const EventSchema = z.discriminatedUnion('kind', [
  // Gateway OFF: legacy bot rules blocked an agent (the "before" state).
  z.object({
    kind: z.literal('legacy_block'),
    platformId: z.string(),
    agentName: z.string().max(80),
    method: z.string().max(10),
    path: z.string().max(500),
  }),
  // Outcome of a forwarded agent action (upstream HTTP status), used for revenue metrics.
  z.object({
    kind: z.literal('outcome'),
    platformId: z.string(),
    sid: z.string(),
    action: z.string(),
    params: z.record(z.unknown()).default({}),
    status: z.number().int(),
  }),
]);

export async function POST(req: Request) {
  const unauth = requireGateway(req);
  if (unauth) return unauth;
  const parsed = EventSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  const ev = parsed.data;
  if (ev.kind === 'legacy_block') {
    appendAudit({
      platformId: ev.platformId,
      agentName: ev.agentName,
      action: 'http.request',
      params: { method: ev.method, path: ev.path },
      decision: 'deny',
      reason: 'legacy_bot_block',
      message: 'Blocked by legacy bot rules: automated traffic. The customer’s transaction is lost.',
    });
  } else {
    const p = ev.params;
    getDb()
      .prepare(
        `INSERT INTO transactions (ts, platform_id, agent_session_id, action, amount, currency, points, upstream_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        nowIso(),
        ev.platformId,
        ev.sid,
        ev.action,
        typeof p.amount === 'number' ? p.amount : null,
        typeof p.currency === 'string' ? p.currency : null,
        typeof p.points === 'number' ? p.points : null,
        ev.status,
      );
    publish({ type: 'state', reason: 'outcome' });
  }
  return NextResponse.json({ ok: true });
}
