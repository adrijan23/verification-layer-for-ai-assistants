import { Footer, Header } from '@/components/Header';
import { FlightResults } from '@/components/FlightResults';
import { AIRPORTS, formatDate, thisFriday } from '@/lib/data';

export const dynamic = 'force-dynamic';

export default function FlightsPage({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const from = (searchParams.from || 'BEG').toUpperCase();
  const to = (searchParams.to || 'CDG').toUpperCase();
  const date = searchParams.date || thisFriday();
  return (
    <>
      <Header active="book" />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-medium uppercase tracking-wider text-navy-700">Select your departing flight</p>
            <h1 className="mt-1 text-3xl font-semibold">
              {AIRPORTS[from] ?? from} <span className="text-brand-red">→</span> {AIRPORTS[to] ?? to}
            </h1>
          </div>
          <p className="rounded-full bg-white px-4 py-2 text-sm font-medium shadow-sm">
            {formatDate(date)} · 1 adult · One way
          </p>
        </div>
        <FlightResults from={from} to={to} date={date} />
      </main>
      <Footer />
    </>
  );
}
