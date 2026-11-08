'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { eur, miles, type Flight } from '@/lib/data';

export function FlightResults({ from, to, date }: { from: string; to: string; date: string }) {
  const [flights, setFlights] = useState<Flight[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    apiFetch<{ flights: Flight[] }>(`/api/flights?from=${from}&to=${to}&date=${date}`).then((r) => {
      if (!alive) return;
      if (r.ok) setFlights(r.data.flights);
      else setError(r.error.message);
    });
    return () => {
      alive = false;
    };
  }, [from, to, date]);

  if (error) {
    return (
      <div className="mt-8 rounded-2xl border border-sky-200 bg-white p-8 text-center text-navy-700" data-testid="flights-error">
        We couldn’t load flights: {error}
      </div>
    );
  }
  if (!flights) {
    return (
      <div className="mt-8 space-y-4" aria-busy>
        {[0, 1].map((i) => (
          <div key={i} className="h-36 animate-pulse rounded-2xl bg-white" />
        ))}
      </div>
    );
  }
  if (flights.length === 0) {
    return <p className="mt-8 rounded-2xl bg-white p-8 text-center">No flights on this route.</p>;
  }

  return (
    <div className="mt-8 space-y-4" data-testid="flight-results">
      {flights.map((f) => (
        <article key={f.id} className="grid overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-sky-200 md:grid-cols-[1.4fr_1fr_1fr]">
          <div className="flex items-center gap-6 p-6">
            <div>
              <p className="text-3xl font-semibold tabular">{f.depart}</p>
              <p className="text-sm text-navy-700">{f.from}</p>
            </div>
            <div className="flex flex-1 flex-col items-center text-xs text-navy-700">
              <span>{f.duration}</span>
              <span className="my-1 h-px w-full bg-sky-200" />
              <span>{f.stops}</span>
            </div>
            <div className="text-right">
              <p className="text-3xl font-semibold tabular">{f.arrive}</p>
              <p className="text-sm text-navy-700">{f.to}</p>
            </div>
          </div>
          {(['economy', 'business'] as const).map((fc) => {
            const fare = f.fares[fc];
            return (
              <Link
                key={fc}
                href={`/checkout/${f.id}?fare=${fc}&date=${date}`}
                data-testid={`fare-${f.id}-${fc}`}
                className={`group flex flex-col justify-center border-t p-6 transition md:border-l md:border-t-0 ${
                  fc === 'business' ? 'bg-navy-900 text-white hover:bg-navy-800' : 'bg-sky-50 hover:bg-sky-100'
                }`}
              >
                <span className={`text-xs font-semibold uppercase tracking-wider ${fc === 'business' ? 'text-navy-100/70' : 'text-navy-700'}`}>
                  {fare.label}
                </span>
                <span className="mt-1 text-2xl font-semibold tabular">{eur(fare.price)}</span>
                <span className={`text-sm ${fc === 'business' ? 'text-navy-100/70' : 'text-navy-700'}`}>or {miles(fare.miles)}</span>
                <span className="mt-2 text-sm font-semibold text-brand-red group-hover:underline">Select →</span>
              </Link>
            );
          })}
          <p className="col-span-full border-t border-sky-100 px-6 py-2 text-xs text-navy-700">
            {f.id} · {f.aircraft}
          </p>
        </article>
      ))}
    </div>
  );
}
