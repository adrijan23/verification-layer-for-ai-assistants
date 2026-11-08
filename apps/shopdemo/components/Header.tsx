import Link from 'next/link';
import { state } from '@/lib/store';
import { AgentGateBanner } from './AgentGateBanner';

export function Logo() {
  return (
    <span className="inline-flex items-baseline gap-0.5 text-2xl font-extrabold tracking-tight text-white">
      shop<span className="text-amber-500">demo</span>
      <svg viewBox="0 0 40 10" className="ml-0.5 h-2.5 w-8 self-end" aria-hidden>
        <path d="M2 2c10 7 26 7 36 0" stroke="#F5A623" strokeWidth="3" fill="none" strokeLinecap="round" />
      </svg>
    </span>
  );
}

export function Header({ q = '' }: { q?: string }) {
  const s = state();
  const count = s.cart.reduce((n, c) => n + c.qty, 0);
  return (
    <header className="sticky top-0 z-20">
      <div className="bg-night-900">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:gap-6 sm:px-6">
          <Link href="/">
            <Logo />
          </Link>
          <div className="hidden text-xs leading-tight text-white/70 lg:block">
            Deliver to Marko
            <br />
            <span className="text-sm font-bold text-white">Belgrade 11000</span>
          </div>
          <form action="/" className="flex min-w-0 flex-1 overflow-hidden rounded-lg">
            <input
              id="q"
              name="q"
              data-testid="search-input"
              defaultValue={q}
              placeholder="Search ShopDemo"
              className="min-w-0 flex-1 px-4 py-2.5 text-night-900 outline-none"
            />
            <button data-testid="search-submit" className="bg-amber-500 px-5 font-bold text-night-900 hover:bg-amber-400" aria-label="Search">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
            </button>
          </form>
          <Link href="/account" className="hidden text-xs leading-tight text-white/70 hover:text-white sm:block">
            Hello, Marko
            <br />
            <span className="text-sm font-bold text-white">Account</span>
          </Link>
          <Link href="/orders" className="hidden text-sm font-bold text-white hover:text-amber-400 sm:block">
            Orders
          </Link>
          <Link href="/cart" className="relative flex items-center gap-1 text-sm font-bold text-white hover:text-amber-400" data-testid="cart-link">
            <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6" />
              <circle cx="10" cy="20" r="1.4" />
              <circle cx="17" cy="20" r="1.4" />
            </svg>
            <span className="absolute -top-1 left-4 rounded-full bg-amber-500 px-1.5 text-xs text-night-900 tabular">{count}</span>
            Cart
          </Link>
        </div>
      </div>
      <div className="bg-night-800 text-sm text-white/90">
        <div className="mx-auto flex max-w-7xl gap-6 overflow-x-auto px-4 py-2 sm:px-6">
          {['Today’s Deals', 'Audio', 'Wearables', 'Computers', 'Accessories', 'Prime Delivery'].map((c) => (
            <span key={c} className="whitespace-nowrap">
              {c}
            </span>
          ))}
        </div>
      </div>
      <AgentGateBanner />
    </header>
  );
}

export function Footer() {
  return (
    <footer className="mt-16 bg-night-950 text-sm text-white/60">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-8 sm:px-6">
        <Logo />
        <p>© 2026 ShopDemo · Demo marketplace, no real orders or payments.</p>
      </div>
    </footer>
  );
}
