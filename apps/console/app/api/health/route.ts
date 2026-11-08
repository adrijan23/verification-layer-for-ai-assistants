import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';

export function GET() {
  const db = getDb();
  const platforms = db.prepare('SELECT id, name, gateway_enabled AS gatewayEnabled FROM platforms').all();
  return NextResponse.json({ ok: true, app: env.displayName, platforms });
}
