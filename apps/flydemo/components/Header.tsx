import Link from 'next/link';
import { state } from '@/lib/store';
import { AgentGateBanner } from './AgentGateBanner';

export function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden>
        <circle cx="16" cy="16" r="15" fill="#E0312B" />
        <path d="M7 18.5 25 10l-4.2 12.3-4.6-3.6-3 3.3-.6-4.7z" fill="#fff" />
      </svg>
      <span className="text-xl font-semibold tracking-tight">
        Fly<span className="font-light">Demo</span>
      </span>
    </span>
  );
}

export function Header({ active }: { active?: 'book' | 'trips' | 'account' }) {
  const s = state();
  const link = (href: string, label: string, key: string) => (
    <Link
      href={href}
      className={`border-b-2 px-1 py-5 text-sm font-medium transition ${
        active === key ? 'border-brand-red text-white' : 'border-transparent text-navy-100/80 hover:text-white'
      }`}
    >
      {label}
    </Link>
  );
  return (
    <header className="sticky top-0 z-20">
      <div className="bg-navy-900 text-white">
        <div className="mx-auto flex max-w-6xl items-center gap-8 px-4 sm:px-6">
          <Link href="/" className="py-3">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            {link('/', 'Book', 'book')}
            {link('/trips', 'My Trips', 'trips')}
            {link('/account', 'Account', 'account')}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="hidden rounded-full bg-white/10 px-3 py-1 tabular sm:inline" data-testid="miles-balance">
              {s.milesBalance.toLocaleString('en-US')} miles
            </span>
            <span className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-red font-semibold">M</span>
              <span className="hidden sm:inline">Marko</span>
            </span>
          </div>
        </div>
      </div>
      <AgentGateBanner />
    </header>
  );
}

export function Footer() {
  return (
    <footer className="mt-16 border-t border-sky-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-navy-700 sm:px-6">
        <Logo className="text-navy-900" />
        <p>© 2026 FlyDemo Airlines · Demo site, no real bookings or payments.</p>
      </div>
    </footer>
  );
}
