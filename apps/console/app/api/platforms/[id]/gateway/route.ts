import { NextResponse } from 'next/server';
import { publish } from '@/lib/bus';
import { getPlatform, setGateway } from '@/lib/repo';

export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const body = (await req.json().catch(() => ({}))) as { enabled?: boolean };
  if (!getPlatform(params.id) || typeof body.enabled !== 'boolean') {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }
  setGateway(params.id, body.enabled);
  publish({ type: 'state', reason: 'gateway_toggled' });
  return NextResponse.json({ ok: true, gatewayEnabled: body.enabled });
}
