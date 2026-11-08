import { NextResponse, type NextRequest } from 'next/server';
import { env } from '@/lib/env';
import { listPasskeys } from '@/lib/webauthn';

export const dynamic = 'force-dynamic';

export function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email') ?? '';
  return NextResponse.json({ hasPasskey: listPasskeys(email).length > 0, fallback: env.passkeyFallback });
}
