import { Footer, Header } from '@/components/Header';
import { PlaceOrder } from '@/components/PlaceOrder';
import { eur, getProduct } from '@/lib/data';
import { cartTotal, state } from '@/lib/store';

export const dynamic = 'force-dynamic';

export default function CheckoutPage() {
  const s = state();
  const total = cartTotal(s.cart);
  return (
    <>
      <Header />
      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-4">
          <h1 className="text-3xl font-extrabold">Checkout</h1>
          <section className="rounded-2xl bg-white p-6 ring-1 ring-paper-200">
            <p className="text-xs font-bold uppercase tracking-wider text-night-700">1 · Shipping address</p>
            <p className="mt-2 font-semibold">Marko Petrović</p>
            <p data-testid="checkout-address">{s.address}</p>
          </section>
          <section className="rounded-2xl bg-white p-6 ring-1 ring-paper-200">
            <p className="text-xs font-bold uppercase tracking-wider text-night-700">2 · Payment method</p>
            <p className="mt-2 flex items-center gap-2 font-semibold">
              <span className="rounded bg-[#1A1F71] px-2 py-0.5 text-xs font-extrabold italic text-white">VISA</span>
              Visa •••• 4242
            </p>
          </section>
          <section className="rounded-2xl bg-white p-6 ring-1 ring-paper-200">
            <p className="text-xs font-bold uppercase tracking-wider text-night-700">3 · Items</p>
            {s.cart.length === 0 ? (
              <p className="mt-2 text-night-700">Your cart is empty.</p>
            ) : (
              <ul className="mt-2 divide-y divide-paper-200">
                {s.cart.map((c) => {
                  const p = getProduct(c.productId)!;
                  return (
                    <li key={c.productId} className="flex justify-between py-2">
                      <span>
                        {p.title} <span className="text-night-700">× {c.qty}</span>
                      </span>
                      <b className="tabular">{eur(p.price * c.qty)}</b>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
        <PlaceOrder items={s.cart} total={total} />
      </main>
      <Footer />
    </>
  );
}
