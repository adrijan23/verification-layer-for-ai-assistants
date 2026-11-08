import { notFound } from 'next/navigation';
import { CheckoutForm } from '@/components/CheckoutForm';
import { Footer, Header } from '@/components/Header';
import { formatDate, getFlight, thisFriday, type FareClass } from '@/lib/data';
import { state } from '@/lib/store';

export const dynamic = 'force-dynamic';

export default function CheckoutPage({
  params,
  searchParams,
}: {
  params: { flightId: string };
  searchParams: Record<string, string | undefined>;
}) {
  const flight = getFlight(params.flightId);
  if (!flight) notFound();
  const fareClass: FareClass = searchParams.fare === 'business' ? 'business' : 'economy';
  const date = searchParams.date || thisFriday();
  const fare = flight.fares[fareClass];

  return (
    <>
      <Header active="book" />
      <main className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0">
          <p className="text-sm font-medium uppercase tracking-wider text-navy-700">Review and pay</p>
          <h1 className="mt-1 text-3xl font-semibold">Checkout</h1>
          <CheckoutForm
            flightId={flight.id}
            fareClass={fareClass}
            price={fare.price}
            miles={fare.miles}
            date={date}
            milesBalance={state().milesBalance}
          />
        </div>
        <aside className="h-fit rounded-2xl bg-navy-900 p-6 text-white lg:sticky lg:top-24">
          <p className="text-xs uppercase tracking-wider text-navy-100/70">{formatDate(date)}</p>
          <p className="mt-2 text-2xl font-semibold">
            {flight.fromCity} → {flight.toCity}
          </p>
          <p className="mt-1 text-sm text-navy-100/80">
            {flight.id} · {flight.depart}–{flight.arrive} · {flight.duration}
          </p>
          <div className="my-5 h-px bg-white/15" />
          <p className="text-sm font-semibold">{fare.label}</p>
          <ul className="mt-2 space-y-1 text-sm text-navy-100/80">
            {fare.perks.map((p) => (
              <li key={p}>✓ {p}</li>
            ))}
          </ul>
          <div className="my-5 h-px bg-white/15" />
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-navy-100/80">Total</span>
            <span className="text-3xl font-semibold tabular">€{fare.price.toLocaleString('en-US')}</span>
          </div>
          <p className="mt-1 text-right text-xs text-navy-100/60">or {fare.miles.toLocaleString('en-US')} miles</p>
        </aside>
      </main>
      <Footer />
    </>
  );
}
