import { NextResponse } from 'next/server';
import { resolveSubject } from '@/lib/consent';
import { registrationOptions } from '@/lib/webauthn';

export const dynamic = 'force-dynamic';

/** Registration needs proof of who the user is: a consent ticket (signed in) or a pending confirmation. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { ticket?: string; confirmationId?: string };
  const subject = resolveSubject(body);
  if (!subject) return NextResponse.json({ error: 'forbidden', message: 'Sign in first.' }, { status: 403 });
  return NextResponse.json(await registrationOptions(subject.email, subject.displayName));
}
