import Link from 'next/link';
import { Footer, Header } from '@/components/Header';
import { eur, getProduct } from '@/lib/data';
import { cartTotal, state } from '@/lib/store';

export const dynamic = 'force-dynamic';

export default function CartPage() {
  const { cart } = state();
  const total = cartTotal(cart);
  return (
    <>
      <Header />
      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_320px]">
        <section className="rounded-2xl bg-white p-6 ring-1 ring-paper-200">
          <h1 className="text-3xl font-extrabold">Shopping cart</h1>
          {cart.length === 0 ? (
            <p className="mt-6 text-night-700">
              Your cart is empty. <Link href="/" className="font-bold text-deal">Browse deals →</Link>
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-paper-200">
              {cart.map((c) => {
                const p = getProduct(c.productId)!;
                return (
                  <li key={c.productId} className="flex items-center justify-between gap-4 py-4">
                    <span>
                      <span className="block font-semibold">{p.title}</span>
                      <span className="text-sm text-night-700">
                        {p.brand} · Qty {c.qty}
                      </span>
                    </span>
                    <span className="text-lg font-extrabold tabular">{eur(p.price * c.qty)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
        <aside className="h-fit rounded-2xl bg-white p-5 ring-1 ring-paper-200">
          <p className="text-lg">
            Subtotal: <b className="tabular">{eur(total)}</b>
          </p>
          <Link
            href="/checkout"
            data-testid="proceed-checkout"
            className="mt-4 block rounded-full bg-amber-400 py-3 text-center font-bold text-night-900 hover:bg-amber-500"
          >
            Proceed to checkout
          </Link>
        </aside>
      </main>
      <Footer />
    </>
  );
}
