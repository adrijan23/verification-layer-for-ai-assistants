import { Footer, Header } from '@/components/Header';
import { ProductCard } from '@/components/ProductCard';
import { SearchResults } from '@/components/SearchResults';
import { PRODUCTS } from '@/lib/data';

export const dynamic = 'force-dynamic';

export default function Home({ searchParams }: { searchParams: { q?: string } }) {
  const q = searchParams.q?.trim() ?? '';
  return (
    <>
      <Header q={q} />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {q ? (
          <SearchResults q={q} />
        ) : (
          <section className="relative overflow-hidden rounded-3xl bg-night-900 px-8 py-10 text-white">
            <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-amber-500/25 blur-2xl" />
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-amber-400">Black Friday week</p>
            <h1 className="mt-2 max-w-xl text-4xl font-extrabold leading-tight">Up to 40% off audio, wearables and laptops</h1>
            <p className="mt-2 text-white/70">Free next-day delivery in Belgrade.</p>
          </section>
        )}
        <h2 className="mt-10 text-2xl font-extrabold">Deals for you, Marko</h2>
        <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {PRODUCTS.map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
