import { NextResponse } from 'next/server';
import { verifyRegistration } from '@/lib/webauthn';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { challengeId?: string; response?: any };
  if (!body.challengeId || !body.response) return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  try {
    const r = await verifyRegistration(body.challengeId, body.response);
    if (!r.ok) return NextResponse.json({ error: 'verify_failed', message: r.error }, { status: 400 });
    return NextResponse.json({ ok: true, token: r.token });
  } catch (e) {
    return NextResponse.json({ error: 'verify_failed', message: (e as Error).message }, { status: 400 });
  }
}
