'use client';

import Link from 'next/link';
import { useState } from 'react';
import { apiFetch } from '@/lib/api';
import type { FareClass } from '@/lib/data';

interface Props {
  flightId: string;
  fareClass: FareClass;
  price: number;
  miles: number;
  date: string;
  milesBalance: number;
}

export function CheckoutForm({ flightId, fareClass, price, miles, date, milesBalance }: Props) {
  const [payWith, setPayWith] = useState<'card' | 'miles'>('card');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ pnr: string; bookingId: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function pay() {
    setBusy(true);
    setError(null);
    const body =
      payWith === 'card'
        ? { flightId, fareClass, date, payWith, total: price, currency: 'EUR' }
        : { flightId, fareClass, date, payWith, miles };
    const r = await apiFetch<{ pnr: string; bookingId: string }>('/api/bookings', { method: 'POST', body: JSON.stringify(body) });
    setBusy(false);
    if (r.ok) setDone(r.data);
    else setError(r.error.message);
  }

  if (done) {
    return (
      <section data-testid="booking-confirmation" className="mt-6 rounded-2xl bg-white p-8 shadow-sm ring-1 ring-sky-200">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-emerald-500 text-xl text-white">✓</span>
          <div>
            <p className="text-xl font-semibold">You’re booked, Marko!</p>
            <p className="text-sm text-navy-700">E-ticket sent to marko@example.com</p>
          </div>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Info label="Confirmation" value={done.pnr} testId="booking-pnr" mono />
          <Info label="Fare" value={fareClass === 'business' ? 'FlyDemo One' : 'Main Cabin'} />
          <Info label="Paid with" value={payWith === 'card' ? `Visa •••• 4242 · €${price}` : `${miles.toLocaleString('en-US')} miles`} />
        </div>
        <Link href="/trips" className="mt-6 inline-block font-semibold text-brand-red hover:underline">
          View my trips →
        </Link>
      </section>
    );
  }

  const option = (key: 'card' | 'miles', title: string, sub: string, disabled = false) => (
    <label
      className={`flex cursor-pointer items-center gap-4 rounded-xl border-2 p-4 transition ${
        payWith === key ? 'border-navy-900 bg-sky-50' : 'border-sky-200 bg-white hover:border-sky-300'
      } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
    >
      <input
        type="radio"
        name="payWith"
        value={key}
        data-testid={`pay-with-${key}`}
        checked={payWith === key}
        disabled={disabled}
        onChange={() => setPayWith(key)}
        className="h-4 w-4 accent-[#0B1F4B]"
      />
      <span className="flex-1">
        <span className="block font-semibold">{title}</span>
        <span className="block text-sm text-navy-700">{sub}</span>
      </span>
    </label>
  );

  return (
    <div className="mt-6 space-y-6">
      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-sky-200">
        <h2 className="text-lg font-semibold">Passenger</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Info label="Name" value="Marko Petrović" />
          <Info label="FlyDemo Miles #" value="FD 2048 7731" mono />
          <Info label="Email" value="marko@example.com" />
        </div>
      </section>
      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-sky-200">
        <h2 className="text-lg font-semibold">Payment</h2>
        <div className="mt-4 grid gap-3">
          {option('card', 'Visa •••• 4242', `Pay €${price.toLocaleString('en-US')}`)}
          {option('miles', 'FlyDemo Miles', `Pay ${miles.toLocaleString('en-US')} miles · balance ${milesBalance.toLocaleString('en-US')}`, milesBalance < miles)}
        </div>
        {error && (
          <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800" data-testid="checkout-error">
            {error}
          </p>
        )}
        <button
          onClick={pay}
          disabled={busy}
          data-testid="pay-button"
          className="mt-6 w-full rounded-xl bg-brand-red px-6 py-4 text-lg font-semibold text-white transition hover:bg-brand-redDark disabled:cursor-wait disabled:opacity-70"
        >
          {busy ? 'Processing payment…' : payWith === 'card' ? `Pay €${price.toLocaleString('en-US')}` : `Pay ${miles.toLocaleString('en-US')} miles`}
        </button>
        <p className="mt-3 text-center text-xs text-navy-700">Demo checkout. No real payment is made.</p>
      </section>
    </div>
  );
}

function Info({ label, value, mono, testId }: { label: string; value: string; mono?: boolean; testId?: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-navy-700">{label}</p>
      <p className={`mt-1 font-medium ${mono ? 'font-mono tracking-wider' : ''}`} data-testid={testId}>
        {value}
      </p>
    </div>
  );
}
