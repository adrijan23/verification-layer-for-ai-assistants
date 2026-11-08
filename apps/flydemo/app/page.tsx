import { Footer, Header } from '@/components/Header';
import { SearchForm } from '@/components/SearchForm';
import { thisFriday } from '@/lib/data';

export const dynamic = 'force-dynamic';

const DESTINATIONS = [
  { city: 'Paris', code: 'CDG', from: '€240', tone: 'from-[#13306B] to-[#4C6FB8]' },
  { city: 'New York', code: 'JFK', from: '€690', tone: 'from-[#0B1F4B] to-[#2C7A9B]' },
  { city: 'Lisbon', code: 'LIS', from: '€280', tone: 'from-[#7A2A1F] to-[#E0312B]' },
];

export default function Home() {
  return (
    <>
      <Header active="book" />
      <main>
        <section className="relative overflow-hidden bg-navy-900 pb-28 pt-14 text-white">
          <div className="pointer-events-none absolute inset-0 opacity-40 [background:radial-gradient(900px_400px_at_85%_-10%,#1D4290,transparent),radial-gradient(600px_300px_at_0%_120%,#E0312B33,transparent)]" />
          <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
            <p className="text-sm uppercase tracking-[0.2em] text-navy-100/70">Belgrade hub · 42 destinations</p>
            <h1 className="mt-3 max-w-2xl text-4xl font-semibold leading-tight sm:text-5xl">Where are you flying next, Marko?</h1>
          </div>
        </section>
        <section className="relative mx-auto -mt-20 max-w-6xl px-4 sm:px-6">
          <SearchForm defaultDate={thisFriday()} />
        </section>
        <section className="mx-auto mt-14 max-w-6xl px-4 sm:px-6">
          <h2 className="text-2xl font-semibold">Fares from Belgrade</h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-3">
            {DESTINATIONS.map((d) => (
              <a
                key={d.code}
                href={`/flights?from=BEG&to=${d.code}&date=${thisFriday()}`}
                className={`group relative flex h-44 flex-col justify-end overflow-hidden rounded-2xl bg-gradient-to-br ${d.tone} p-5 text-white shadow-sm`}
              >
                <span className="absolute right-4 top-4 text-5xl font-semibold opacity-15">{d.code}</span>
                <span className="text-2xl font-semibold">{d.city}</span>
                <span className="text-sm text-white/80">
                  Round trip from <b className="text-white">{d.from}</b>
                </span>
              </a>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
