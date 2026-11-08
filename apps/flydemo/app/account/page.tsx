import { EmailForm } from '@/components/EmailForm';
import { Footer, Header } from '@/components/Header';
import { state } from '@/lib/store';

export const dynamic = 'force-dynamic';

export default function AccountPage() {
  const s = state();
  return (
    <>
      <Header active="account" />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <h1 className="text-3xl font-semibold">Account settings</h1>
        <section className="mt-6 rounded-2xl bg-white p-6 ring-1 ring-sky-200">
          <div className="flex items-center gap-4">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-navy-900 text-xl font-semibold text-white">M</span>
            <div>
              <p className="text-lg font-semibold">Marko Petrović</p>
              <p className="text-sm text-navy-700">
                FlyDemo Miles Gold · <span className="tabular">{s.milesBalance.toLocaleString('en-US')}</span> miles
              </p>
            </div>
          </div>
        </section>
        <section className="mt-6 rounded-2xl bg-white p-6 ring-1 ring-sky-200">
          <h2 className="text-lg font-semibold">Sign-in email</h2>
          <p className="mt-1 text-sm text-navy-700">
            Current: <b data-testid="current-email">{s.email}</b>
          </p>
          <EmailForm />
        </section>
      </main>
      <Footer />
    </>
  );
}
