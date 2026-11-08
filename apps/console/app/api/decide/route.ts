import { NextResponse } from 'next/server';
import { DecideRequestSchema, handleDecide } from '@/lib/decide';
import { requireGateway } from '@/lib/gatewayAuth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const unauth = requireGateway(req);
  if (unauth) return unauth;
  const parsed = DecideRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'bad_request', issues: parsed.error.issues }, { status: 400 });
  try {
    return NextResponse.json(handleDecide(parsed.data));
  } catch (e) {
    return NextResponse.json({ error: 'decide_failed', message: (e as Error).message }, { status: 400 });
  }
}
