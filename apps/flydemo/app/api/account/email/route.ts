import { NextResponse, type NextRequest } from 'next/server';
import { state } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { email?: string };
  if (!body.email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(body.email)) {
    return NextResponse.json({ error: 'invalid_email', message: 'Enter a valid email address' }, { status: 400 });
  }
  state().email = body.email;
  return NextResponse.json({ ok: true, email: body.email });
}
