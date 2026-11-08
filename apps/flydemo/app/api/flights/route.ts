import { NextResponse, type NextRequest } from 'next/server';
import { FLIGHTS, thisFriday } from '@/lib/data';

export const dynamic = 'force-dynamic';

export function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const from = q.get('from')?.toUpperCase();
  const to = q.get('to')?.toUpperCase();
  const date = q.get('date') || thisFriday();
  const flights = FLIGHTS.filter((f) => (!from || f.from === from) && (!to || f.to === to));
  return NextResponse.json({ date, flights });
}
