import { CancelButton } from '@/components/CancelButton';
import { Footer, Header } from '@/components/Header';
import { formatDate, getFlight } from '@/lib/data';
import { state } from '@/lib/store';

export const dynamic = 'force-dynamic';

export default function TripsPage() {
  const { bookings } = state();
  return (
    <>
      <Header active="trips" />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <h1 className="text-3xl font-semibold">My Trips</h1>
        {bookings.length === 0 ? (
          <div className="mt-8 rounded-2xl bg-white p-10 text-center text-navy-700 ring-1 ring-sky-200">
            No upcoming trips. <a href="/" className="font-semibold text-brand-red">Book a flight →</a>
          </div>
        ) : (
          <div className="mt-6 space-y-4" data-testid="trips-list">
            {bookings.map((b) => {
              const f = getFlight(b.flightId)!;
              return (
                <article key={b.id} className="flex flex-wrap items-center gap-6 rounded-2xl bg-white p-6 ring-1 ring-sky-200">
                  <div className="min-w-[180px]">
                    <p className="text-xs uppercase tracking-wider text-navy-700">{formatDate(b.date)}</p>
                    <p className="text-xl font-semibold">
                      {f.fromCity} → {f.toCity}
                    </p>
                    <p className="text-sm text-navy-700">
                      {f.id} · {f.depart} · {b.fareClass === 'business' ? 'FlyDemo One' : 'Main Cabin'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-navy-700">Confirmation</p>
                    <p className="font-mono text-lg tracking-wider">{b.pnr}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-navy-700">Paid</p>
                    <p className="font-medium">{b.payWith === 'card' ? `€${b.total} · Visa 4242` : `${b.miles.toLocaleString('en-US')} miles`}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-navy-700">Booked by</p>
                    <p className="font-medium">{b.bookedBy}</p>
                  </div>
                  <div className="ml-auto">
                    {b.status === 'cancelled' ? (
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600">
                        Cancelled · refund €{b.refundAmount ?? 0}
                      </span>
                    ) : (
                      <CancelButton bookingId={b.id} refundAmount={b.total} />
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
