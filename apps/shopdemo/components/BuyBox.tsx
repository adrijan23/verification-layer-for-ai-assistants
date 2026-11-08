'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { apiFetch } from '@/lib/api';
import { eur } from '@/lib/data';

export function BuyBox({ productId, price, delivery }: { productId: string; price: number; delivery: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<'add' | 'buy' | null>(null);
  const [added, setAdded] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function add(replace: boolean) {
    setBusy(replace ? 'buy' : 'add');
    setErr(null);
    const r = await apiFetch('/api/cart', { method: 'POST', body: JSON.stringify({ productId, qty: 1, replace }) });
    setBusy(null);
    if (!r.ok) return setErr(r.error.message);
    if (replace) router.push('/checkout');
    else {
      setAdded(true);
      router.refresh();
    }
  }

  return (
    <aside className="h-fit rounded-2xl bg-white p-5 ring-1 ring-paper-200">
      <p className="text-3xl font-extrabold tabular">{eur(price)}</p>
      <p className="mt-1 text-sm">
        FREE delivery <b>{delivery}</b>
      </p>
      <p className="text-sm text-night-700">Deliver to Marko, Belgrade 11000</p>
      <p className="mt-3 font-bold text-emerald-700">In stock</p>
      <button
        data-testid="add-to-cart"
        disabled={!!busy}
        onClick={() => add(false)}
        className="mt-4 w-full rounded-full bg-amber-400 py-3 font-bold text-night-900 hover:bg-amber-500 disabled:opacity-60"
      >
        {busy === 'add' ? 'Adding…' : added ? 'Added ✓ Add another' : 'Add to cart'}
      </button>
      <button
        data-testid="buy-now"
        disabled={!!busy}
        onClick={() => add(true)}
        className="mt-2 w-full rounded-full bg-amber-600 py-3 font-bold text-white hover:brightness-95 disabled:opacity-60"
      >
        {busy === 'buy' ? 'One moment…' : 'Buy now'}
      </button>
      {err && <p className="mt-3 text-sm text-red-700">{err}</p>}
      <p className="mt-4 text-xs text-night-700">Ships from and sold by ShopDemo. 30-day returns.</p>
    </aside>
  );
}
