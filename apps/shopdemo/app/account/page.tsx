import { AddressForm } from '@/components/AddressForm';
import { Footer, Header } from '@/components/Header';
import { state } from '@/lib/store';

export const dynamic = 'force-dynamic';

export default function AccountPage() {
  const s = state();
  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <h1 className="text-3xl font-extrabold">Your account</h1>
        <section className="mt-6 rounded-2xl bg-white p-6 ring-1 ring-paper-200">
          <h2 className="text-lg font-bold">Default shipping address</h2>
          <p className="mt-1" data-testid="current-address">
            {s.address}
          </p>
          <AddressForm />
        </section>
        <section className="mt-4 rounded-2xl bg-white p-6 ring-1 ring-paper-200">
          <h2 className="text-lg font-bold">Payment methods</h2>
          <p className="mt-1">Visa •••• 4242 · expires 08/29</p>
        </section>
      </main>
      <Footer />
    </>
  );
}
