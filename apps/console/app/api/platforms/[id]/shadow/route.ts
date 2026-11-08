import { NextResponse } from 'next/server';
import { publish } from '@/lib/bus';
import { getPlatform, setShadow } from '@/lib/repo';

export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const body = (await req.json().catch(() => ({}))) as { enabled?: boolean };
  if (!getPlatform(params.id) || typeof body.enabled !== 'boolean') {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }
  setShadow(params.id, body.enabled);
  publish({ type: 'state', reason: 'shadow_toggled' });
  return NextResponse.json({ ok: true, shadowMode: body.enabled });
}
