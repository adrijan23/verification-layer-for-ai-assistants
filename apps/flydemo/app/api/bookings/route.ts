import { NextResponse, type NextRequest } from 'next/server';
import { getFlight, thisFriday, type FareClass } from '@/lib/data';
import { actorFrom, nextIds, state } from '@/lib/store';

export const dynamic = 'force-dynamic';

const bad = (message: string) => NextResponse.json({ error: 'invalid_booking', message }, { status: 400 });

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as {
    flightId?: string;
    fareClass?: FareClass;
    total?: number;
    currency?: string;
    payWith?: 'card' | 'miles';
    miles?: number;
    date?: string;
  } | null;
  if (!body) return bad('Invalid JSON body');

  const flight = body.flightId ? getFlight(body.flightId) : undefined;
  if (!flight) return bad('Unknown flight');
  if (body.fareClass !== 'economy' && body.fareClass !== 'business') return bad('Unknown fare class');
  const fare = flight.fares[body.fareClass];
  const s = state();

  // The platform prices the ticket itself: a client-declared total that does not match is rejected.
  if (body.payWith === 'card') {
    if (body.currency !== 'EUR' || body.total !== fare.price) return bad(`Price mismatch: this fare costs €${fare.price}`);
  } else if (body.payWith === 'miles') {
    if (body.miles !== fare.miles) return bad(`Miles mismatch: this fare costs ${fare.miles} miles`);
    if (s.milesBalance < fare.miles) return bad('Not enough miles');
    s.milesBalance -= fare.miles;
  } else {
    return bad('Unknown payment method');
  }

  const { id, pnr } = nextIds();
  s.bookings.unshift({
    id,
    pnr,
    flightId: flight.id,
    fareClass: body.fareClass,
    date: body.date || thisFriday(),
    payWith: body.payWith,
    total: body.payWith === 'card' ? fare.price : 0,
    miles: body.payWith === 'miles' ? fare.miles : 0,
    status: 'ticketed',
    bookedBy: actorFrom(req.headers),
    createdAt: new Date().toISOString(),
  });
  return NextResponse.json({ bookingId: id, pnr, status: 'ticketed', milesBalance: s.milesBalance });
}
