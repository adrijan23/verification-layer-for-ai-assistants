import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/repo';

export const dynamic = 'force-dynamic';

/** Polled by the agent runner after it relayed a connect link, and while a request is held. */
export function GET(_req: Request, { params }: { params: { sid: string } }) {
  const s = getSession(params.sid);
  if (!s) return NextResponse.json({ status: 'unknown' }, { status: 404 });
  const pending = getDb()
    .prepare(`SELECT id, action FROM confirmations WHERE agent_session_id = ? AND status = 'pending' ORDER BY created_at DESC LIMIT 1`)
    .get(params.sid) as { id: string; action: string } | undefined;
  return NextResponse.json({ status: s.status, platformId: s.platformId, grantId: s.grantId, pendingConfirmation: pending ?? null });
}
