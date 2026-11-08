'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { eur, type Product } from '@/lib/data';

/** Search results are loaded through the API (mapped to product.search at the gateway). */
export function SearchResults({ q }: { q: string }) {
  const [items, setItems] = useState<Product[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ products: Product[] }>(`/api/products?q=${encodeURIComponent(q)}`).then((r) => {
      if (r.ok) setItems(r.data.products);
      else setError(r.error.message);
    });
  }, [q]);

  if (error) return <p className="rounded-xl bg-white p-6 ring-1 ring-paper-200" data-testid="search-error">Search unavailable: {error}</p>;
  if (!items) return <div className="h-32 animate-pulse rounded-xl bg-white" />;
  return (
    <div data-testid="search-results" className="divide-y divide-paper-200 rounded-2xl bg-white ring-1 ring-paper-200">
      <p className="px-5 py-3 text-sm text-night-700">
        {items.length} results for <b>“{q}”</b>
      </p>
      {items.map((p) => (
        <Link key={p.id} href={`/products/${p.id}`} className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-paper-50">
          <span>
            <span className="block text-xs font-bold uppercase tracking-wider text-night-700">{p.brand}</span>
            <span className="font-semibold">{p.title}</span>
          </span>
          <span className="text-xl font-extrabold tabular">{eur(p.price)}</span>
        </Link>
      ))}
    </div>
  );
}
