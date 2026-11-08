import { NextResponse } from 'next/server';
import { resolveSubject } from '@/lib/consent';
import { authenticationOptions, listPasskeys } from '@/lib/webauthn';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { ticket?: string; confirmationId?: string };
  const subject = resolveSubject(body);
  if (!subject) return NextResponse.json({ error: 'forbidden', message: 'Nothing to approve.' }, { status: 403 });
  if (listPasskeys(subject.email).length === 0) {
    return NextResponse.json({ error: 'no_passkey', message: 'No passkey registered yet.' }, { status: 404 });
  }
  return NextResponse.json(await authenticationOptions(subject.email));
}
