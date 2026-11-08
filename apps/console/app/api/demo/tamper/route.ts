import { NextResponse } from 'next/server';
import { publish } from '@/lib/bus';
import { getDb } from '@/lib/db';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';

/**
 * Demo tool: simulate an insider editing the audit log directly in the database
 * (changes the amount of the most recent priced event, without recomputing hashes).
 */
export function POST() {
  if (!env.demoTools) return NextResponse.json({ error: 'disabled' }, { status: 403 });
  const db = getDb();
  // Target the most recent completed purchase decision (e.g. "€89 order → allow" becomes €9).
  const row = db
    .prepare(
      `SELECT seq, params_json FROM audit_events
       WHERE json_extract(params_json, '$.amount') IS NOT NULL AND decision IN ('allow','approved')
       ORDER BY seq DESC LIMIT 1`,
    )
    .get() as { seq: number; params_json: string } | undefined;
  const target = row ?? (db.prepare('SELECT seq, params_json FROM audit_events ORDER BY seq DESC LIMIT 1').get() as typeof row);
  if (!target) return NextResponse.json({ error: 'empty_log' }, { status: 404 });
  const params = JSON.parse(target.params_json);
  params.amount = typeof params.amount === 'number' ? Math.round(params.amount / 10) : 1;
  db.prepare('UPDATE audit_events SET params_json = ? WHERE seq = ?').run(JSON.stringify(params), target.seq);
  publish({ type: 'state', reason: 'tampered' });
  return NextResponse.json({ ok: true, tamperedSeq: target.seq });
}
