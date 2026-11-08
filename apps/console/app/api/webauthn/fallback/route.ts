import { NextResponse } from 'next/server';
import { resolveSubject } from '@/lib/consent';
import { env } from '@/lib/env';
import { issueAssertion } from '@/lib/webauthn';

export const dynamic = 'force-dynamic';

/** Stage safety net (DEMO_PASSKEY_FALLBACK=true): approve without a passkey. Logged as demo_fallback. */
export async function POST(req: Request) {
  if (!env.passkeyFallback) return NextResponse.json({ error: 'disabled' }, { status: 403 });
  const body = (await req.json().catch(() => ({}))) as { ticket?: string; confirmationId?: string };
  const subject = resolveSubject(body);
  if (!subject) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  return NextResponse.json({ ok: true, token: issueAssertion(subject.email, 'demo_fallback') });
}
