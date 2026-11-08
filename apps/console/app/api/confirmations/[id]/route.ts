import { NextResponse } from 'next/server';
import { getConfirmation, resolveConfirmation } from '@/lib/confirmations';
import { getGrant } from '@/lib/repo';
import { consumeAssertion } from '@/lib/webauthn';

export const dynamic = 'force-dynamic';

/** Phone: approve (requires a fresh passkey assertion) or deny a held agent action. */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const body = (await req.json().catch(() => ({}))) as { approve?: boolean; assertionToken?: string };
  const c = getConfirmation(params.id);
  if (!c) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (c.status !== 'pending') return NextResponse.json({ error: 'already_decided', status: c.status }, { status: 409 });
  if (body.approve) {
    const grant = getGrant(c.grantId);
    const method = grant && body.assertionToken ? consumeAssertion(body.assertionToken, grant.userEmail) : null;
    if (!method) return NextResponse.json({ error: 'passkey_required', message: 'Approve with your passkey.' }, { status: 401 });
    resolveConfirmation(c.id, 'approved', method === 'demo_fallback' ? 'demo_fallback' : 'passkey');
  } else {
    resolveConfirmation(c.id, 'denied');
  }
  return NextResponse.json({ ok: true, status: getConfirmation(c.id)?.status });
}
