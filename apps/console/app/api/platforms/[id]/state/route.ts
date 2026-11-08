import { NextResponse } from 'next/server';
import { requireGateway } from '@/lib/gatewayAuth';
import { getPlatform } from '@/lib/repo';

export const dynamic = 'force-dynamic';

export function GET(req: Request, { params }: { params: { id: string } }) {
  const unauth = requireGateway(req);
  if (unauth) return unauth;
  const p = getPlatform(params.id);
  if (!p) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ gatewayEnabled: p.gatewayEnabled, shadowMode: p.shadowMode });
}
