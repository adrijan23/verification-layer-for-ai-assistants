import { Footer, Header } from '@/components/Header';
import { ReturnButton } from '@/components/ReturnButton';
import { eur, getProduct } from '@/lib/data';
import { state } from '@/lib/store';

export const dynamic = 'force-dynamic';

export default function OrdersPage() {
  const { orders } = state();
  return (
    <>
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <h1 className="text-3xl font-extrabold">Your orders</h1>
        {orders.length === 0 ? (
          <p className="mt-6 rounded-2xl bg-white p-8 text-night-700 ring-1 ring-paper-200">No orders yet.</p>
        ) : (
          <div className="mt-6 space-y-4" data-testid="orders-list">
            {orders.map((o) => (
              <article key={o.id} className="overflow-hidden rounded-2xl bg-white ring-1 ring-paper-200">
                <div className="flex flex-wrap gap-6 bg-paper-100 px-5 py-3 text-xs uppercase tracking-wider text-night-700">
                  <span>
                    Order placed<br />
                    <b className="text-sm normal-case tracking-normal text-night-900">{new Date(o.createdAt).toLocaleDateString('en-GB')}</b>
                  </span>
                  <span>
                    Total<br />
                    <b className="text-sm normal-case tracking-normal text-night-900 tabular">{eur(o.amount)}</b>
                  </span>
                  <span>
                    Ship to<br />
                    <b className="text-sm normal-case tracking-normal text-night-900">{o.address}</b>
                  </span>
                  <span>
                    Placed by<br />
                    <b className="text-sm normal-case tracking-normal text-night-900">{o.placedBy}</b>
                  </span>
                  <span className="ml-auto font-mono normal-case">#{o.id}</span>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
                  <ul>
                    {o.items.map((i) => (
                      <li key={i.productId} className="font-semibold">
                        {getProduct(i.productId)?.title} <span className="font-normal text-night-700">× {i.qty}</span>
                      </li>
                    ))}
                  </ul>
                  {o.status === 'return_requested' ? (
                    <span className="rounded-full bg-paper-100 px-3 py-1 text-sm font-semibold">Return requested · refund {eur(o.refundAmount ?? 0)}</span>
                  ) : (
                    <ReturnButton orderId={o.id} amount={o.amount} />
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
