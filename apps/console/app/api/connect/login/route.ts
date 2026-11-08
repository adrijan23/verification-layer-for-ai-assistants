import { NextResponse } from 'next/server';
import { z } from 'zod';
import { CONSENT_COOKIE } from '@/lib/consent';
import { getDb } from '@/lib/db';
import { newId, nowIso } from '@/lib/ids';
import { getPlatformUser, getSession } from '@/lib/repo';

export const dynamic = 'force-dynamic';

const Body = z.object({
  sid: z.string().min(4).max(80),
  platformId: z.string().max(40),
  email: z.string().email().max(200),
  password: z.string().min(1).max(200),
});

/** Consent step A: the user signs in to their platform account (validated against platform_users). */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'bad_request', message: 'Enter your email and password.' }, { status: 400 });
  const { sid, platformId, email, password } = parsed.data;
  const session = getSession(sid);
  if (!session || session.platformId !== platformId) {
    return NextResponse.json({ error: 'unknown_session', message: 'This approval link is not valid anymore.' }, { status: 404 });
  }
  const user = getPlatformUser(platformId, email.toLowerCase());
  if (!user || user.password !== password) {
    return NextResponse.json({ error: 'invalid_credentials', message: 'Wrong email or password.' }, { status: 401 });
  }
  const ticket = newId('ct', 18);
  getDb()
    .prepare('INSERT INTO consent_tickets (id, sid, platform_id, platform_user_id, email, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(ticket, sid, platformId, user.id, user.email, nowIso());
  const res = NextResponse.json({ ticket, user: { email: user.email, displayName: user.display_name } });
  // Double-submit CSRF protection: the ticket must come back both in the body and in this cookie.
  res.cookies.set(CONSENT_COOKIE, ticket, { httpOnly: true, sameSite: 'strict', path: '/', maxAge: 15 * 60 });
  return res;
}
