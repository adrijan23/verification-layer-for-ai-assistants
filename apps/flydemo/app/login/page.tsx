import { Footer, Header } from '@/components/Header';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-md px-4 py-16">
        <div className="rounded-2xl bg-white p-8 ring-1 ring-sky-200">
          <h1 className="text-2xl font-semibold">Sign in</h1>
          <p className="mt-2 text-navy-700">
            You’re signed in as <b>Marko</b> (marko@example.com).
          </p>
          <a href="/" className="mt-6 inline-block rounded-lg bg-brand-red px-5 py-3 font-semibold text-white">
            Continue to booking
          </a>
        </div>
      </main>
      <Footer />
    </>
  );
}
