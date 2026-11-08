'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AIRPORTS } from '@/lib/data';

export function SearchForm({ defaultDate }: { defaultDate: string }) {
  const router = useRouter();
  const [from, setFrom] = useState('BEG');
  const [to, setTo] = useState('CDG');
  const [date, setDate] = useState(defaultDate);

  const field = 'mt-1 w-full rounded-lg border border-sky-200 bg-sky-50 px-3 py-3 text-base font-medium text-navy-900 outline-none focus:border-navy-700 focus:ring-2 focus:ring-navy-700/20';

  return (
    <form
      data-testid="search-form"
      onSubmit={(e) => {
        e.preventDefault();
        router.push(`/flights?from=${from}&to=${to}&date=${date}`);
      }}
      className="grid gap-4 rounded-2xl bg-white p-5 shadow-[0_20px_50px_-20px_rgba(11,31,75,0.35)] sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end sm:p-6"
    >
      <label className="block text-xs font-semibold uppercase tracking-wider text-navy-700">
        From
        <select id="from" data-testid="search-from" value={from} onChange={(e) => setFrom(e.target.value)} className={field}>
          <option value="BEG">BEG · Belgrade</option>
        </select>
      </label>
      <label className="block text-xs font-semibold uppercase tracking-wider text-navy-700">
        To
        <select id="to" data-testid="search-to" value={to} onChange={(e) => setTo(e.target.value)} className={field}>
          {Object.entries(AIRPORTS)
            .filter(([c]) => c !== 'BEG')
            .map(([code, city]) => (
              <option key={code} value={code}>
                {code} · {city}
              </option>
            ))}
        </select>
      </label>
      <label className="block text-xs font-semibold uppercase tracking-wider text-navy-700">
        Depart
        <input id="date" data-testid="search-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className={field} />
      </label>
      <button
        type="submit"
        data-testid="search-submit"
        className="h-[50px] rounded-lg bg-brand-red px-8 font-semibold text-white transition hover:bg-brand-redDark"
      >
        Find flights
      </button>
    </form>
  );
}
