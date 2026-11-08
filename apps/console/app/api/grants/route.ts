import { NextResponse, type NextRequest } from 'next/server';
import { listActiveGrantsForEmail, listGrants } from '@/lib/repo';

export const dynamic = 'force-dynamic';

export function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email');
  return NextResponse.json({ grants: email ? listActiveGrantsForEmail(email) : listGrants() });
}
