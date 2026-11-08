import { NextResponse, type NextRequest } from 'next/server';
import { state } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = (await req.json().catch(() => ({}))) as { refundAmount?: number };
  const s = state();
  const b = s.bookings.find((x) => x.id === params.id);
  if (!b) return NextResponse.json({ error: 'not_found', message: 'Booking not found' }, { status: 404 });
  if (b.status === 'cancelled') return NextResponse.json({ error: 'already_cancelled', message: 'Already cancelled' }, { status: 409 });
  b.status = 'cancelled';
  b.refundAmount = typeof body.refundAmount === 'number' ? body.refundAmount : b.total;
  if (b.payWith === 'miles') s.milesBalance += b.miles;
  return NextResponse.json({ bookingId: b.id, status: 'cancelled', refundAmount: b.refundAmount });
}
