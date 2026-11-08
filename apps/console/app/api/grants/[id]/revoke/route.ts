import { NextResponse } from 'next/server';
import { revokeGrant } from '@/lib/grants';

export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const body = (await req.json().catch(() => ({}))) as { by?: 'dashboard' | 'phone' };
  const ok = revokeGrant(params.id, body.by === 'phone' ? 'phone' : 'dashboard');
  if (!ok) return NextResponse.json({ error: 'not_found_or_revoked' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
