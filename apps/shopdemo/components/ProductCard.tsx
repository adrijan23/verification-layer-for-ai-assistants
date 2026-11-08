import Link from 'next/link';
import { eur, type Product } from '@/lib/data';
import { ProductArt, Stars } from './ProductArt';

export function ProductCard({ p }: { p: Product }) {
  return (
    <Link
      href={`/products/${p.id}`}
      data-testid={`product-${p.id}`}
      className="group flex flex-col rounded-2xl bg-white p-4 ring-1 ring-paper-200 transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      <ProductArt product={p} />
      <p className="mt-3 text-xs font-bold uppercase tracking-wider text-night-700">{p.brand}</p>
      <p className="font-semibold leading-snug group-hover:text-deal">{p.title}</p>
      <Stars rating={p.rating} reviews={p.reviews} />
      <p className="mt-auto pt-2">
        <span className="text-2xl font-extrabold tabular">{eur(p.price)}</span>
        {p.listPrice && <span className="ml-2 text-sm text-night-700 line-through">{eur(p.listPrice)}</span>}
      </p>
      <p className="text-xs text-night-700">
        Delivery <b>{p.delivery}</b>
      </p>
    </Link>
  );
}
