import { Footer, Header } from '@/components/Header';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-md px-4 py-16">
        <div className="rounded-2xl bg-white p-8 ring-1 ring-paper-200">
          <h1 className="text-2xl font-extrabold">Sign in</h1>
          <p className="mt-2">
            You’re signed in as <b>Marko</b> (marko@example.com).
          </p>
          <a href="/" className="mt-6 inline-block rounded-full bg-amber-400 px-5 py-3 font-bold text-night-900">
            Continue shopping
          </a>
        </div>
      </main>
      <Footer />
    </>
  );
}
