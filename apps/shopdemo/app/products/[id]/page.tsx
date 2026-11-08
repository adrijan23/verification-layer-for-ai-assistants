import { notFound } from 'next/navigation';
import { BuyBox } from '@/components/BuyBox';
import { Footer, Header } from '@/components/Header';
import { ProductArt, Stars } from '@/components/ProductArt';
import { eur, getProduct } from '@/lib/data';

export const dynamic = 'force-dynamic';

export default function ProductPage({ params }: { params: { id: string } }) {
  const p = getProduct(params.id);
  if (!p) notFound();
  return (
    <>
      <Header />
      <main className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1.1fr_1fr_320px]">
        <div className="rounded-3xl bg-white p-6 ring-1 ring-paper-200">
          <ProductArt product={p} size="lg" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold uppercase tracking-wider text-night-700">{p.brand}</p>
          <h1 className="mt-1 text-3xl font-extrabold leading-tight" data-testid="product-title">
            {p.title}
          </h1>
          <div className="mt-2">
            <Stars rating={p.rating} reviews={p.reviews} />
          </div>
          <div className="my-5 h-px bg-paper-200" />
          {p.listPrice && (
            <p className="text-sm">
              <span className="rounded bg-deal px-2 py-0.5 font-bold text-white">-{Math.round((1 - p.price / p.listPrice) * 100)}%</span>
              <span className="ml-2 text-night-700">Black Friday deal</span>
            </p>
          )}
          <p className="mt-2 text-4xl font-extrabold tabular">{eur(p.price)}</p>
          {p.listPrice && <p className="text-sm text-night-700">List price: <span className="line-through">{eur(p.listPrice)}</span></p>}
          <h2 className="mt-6 font-bold">About this item</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-night-800">
            {p.bullets.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </div>
        <BuyBox productId={p.id} price={p.price} delivery={p.delivery} />
      </main>
      <Footer />
    </>
  );
}
