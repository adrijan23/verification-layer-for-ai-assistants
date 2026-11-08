'use client';

import Link from 'next/link';
import { useState } from 'react';
import { apiFetch } from '@/lib/api';
import { eur } from '@/lib/data';
import type { CartItem } from '@/lib/store';

export function PlaceOrder({ items, total }: { items: CartItem[]; total: number }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ orderId: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  if (done) {
    return (
      <aside data-testid="order-confirmation" className="h-fit rounded-2xl bg-white p-6 ring-2 ring-emerald-500">
        <p className="text-xl font-extrabold text-emerald-700">✓ Order placed, thanks!</p>
        <p className="mt-2 text-sm">Order number</p>
        <p className="font-mono text-lg" data-testid="order-id">
          {done.orderId}
        </p>
        <p className="mt-2 text-sm text-night-700">Arriving tomorrow. Confirmation sent to marko@example.com.</p>
        <Link href="/orders" className="mt-4 inline-block font-bold text-deal">
          Your orders →
        </Link>
      </aside>
    );
  }

  return (
    <aside className="h-fit rounded-2xl bg-white p-5 ring-1 ring-paper-200 lg:sticky lg:top-32">
      <button
        data-testid="place-order"
        disabled={busy || items.length === 0}
        onClick={async () => {
          setBusy(true);
          setErr(null);
          const r = await apiFetch<{ orderId: string }>('/api/orders', {
            method: 'POST',
            body: JSON.stringify({ items, amount: total, currency: 'EUR' }),
          });
          setBusy(false);
          if (r.ok) setDone(r.data);
          else setErr(r.error.message);
        }}
        className="w-full rounded-full bg-amber-400 py-3 font-bold text-night-900 hover:bg-amber-500 disabled:opacity-60"
      >
        {busy ? 'Placing order…' : 'Place your order'}
      </button>
      <div className="mt-4 space-y-1 text-sm">
        <p className="flex justify-between">
          <span>Items</span>
          <span className="tabular">{eur(total)}</span>
        </p>
        <p className="flex justify-between">
          <span>Delivery</span>
          <span>FREE</span>
        </p>
      </div>
      <p className="mt-3 flex justify-between border-t border-paper-200 pt-3 text-xl font-extrabold text-deal">
        <span>Order total</span>
        <span className="tabular">{eur(total)}</span>
      </p>
      {err && (
        <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800" data-testid="order-error">
          {err}
        </p>
      )}
    </aside>
  );
}
