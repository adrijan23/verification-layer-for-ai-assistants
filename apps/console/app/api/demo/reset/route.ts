import { NextResponse, type NextRequest } from 'next/server';
import { resetDemo } from '@/lib/reset';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  await resetDemo(req.nextUrl.searchParams.get('full') === '1');
  return NextResponse.json({ ok: true });
}
