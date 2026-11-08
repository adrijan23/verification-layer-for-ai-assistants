import type { ReactNode } from 'react';

export function ShieldMark({ className = 'h-7 w-7' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <path d="M16 2.5 4.5 7v8.2c0 7.1 4.9 12.4 11.5 14.3 6.6-1.9 11.5-7.2 11.5-14.3V7z" fill="#19C3A6" />
      <path d="m10.5 16.2 3.8 3.8 7.4-8" stroke="#0B0F17" strokeWidth="2.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PlatformMark({ mark, color, accent, size = 'md' }: { mark: string; color: string; accent: string; size?: 'sm' | 'md' | 'lg' }) {
  const cls = size === 'sm' ? 'h-6 w-6 text-[10px] rounded-md' : size === 'lg' ? 'h-12 w-12 text-base rounded-xl' : 'h-9 w-9 text-xs rounded-lg';
  return (
    <span className={`grid shrink-0 place-items-center font-bold tracking-wide ${cls}`} style={{ background: color, color: '#fff', boxShadow: `inset 0 -3px 0 ${accent}` }}>
      {mark}
    </span>
  );
}

const DECISION_STYLE: Record<string, { label: string; cls: string }> = {
  allow: { label: 'Allow', cls: 'bg-allow/15 text-allow ring-allow/30' },
  approved: { label: 'Approved', cls: 'bg-allow/15 text-allow ring-allow/30' },
  confirm: { label: 'Confirm', cls: 'bg-confirm/15 text-confirm ring-confirm/30' },
  deny: { label: 'Deny', cls: 'bg-deny/15 text-deny ring-deny/30' },
  denied_by_user: { label: 'Denied by user', cls: 'bg-deny/15 text-deny ring-deny/30' },
  throttle: { label: 'Throttle', cls: 'bg-throttle/15 text-throttle ring-throttle/30' },
  connect_required: { label: 'Connect', cls: 'bg-connect/15 text-connect ring-connect/30' },
  revoked: { label: 'Revoked', cls: 'bg-deny/10 text-deny ring-deny/25' },
  expired: { label: 'Expired', cls: 'bg-throttle/15 text-throttle ring-throttle/30' },
};

export function DecisionPill({ decision }: { decision: string }) {
  const s = DECISION_STYLE[decision] ?? { label: decision, cls: 'bg-ink-700 text-ink-200 ring-ink-600' };
  return (
    <span data-decision={decision} className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ring-1 ${s.cls}`}>
      {s.label}
    </span>
  );
}

export function Panel({ title, right, children, className = '' }: { title: ReactNode; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`min-w-0 rounded-xl border border-ink-800 bg-ink-900 ${className}`}>
      <header className="flex items-center justify-between gap-3 border-b border-ink-800 px-4 py-3">
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-300">{title}</h2>
        {right}
      </header>
      {children}
    </section>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  testId,
  size = 'md',
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  testId?: string;
  size?: 'sm' | 'md';
}) {
  const track = size === 'sm' ? 'h-5 w-9' : 'h-7 w-[52px]';
  const knob = size === 'sm' ? 'h-4 w-4 peer-checked:translate-x-4' : 'h-6 w-6 peer-checked:translate-x-[24px]';
  return (
    <label className="inline-flex cursor-pointer items-center gap-2">
      <span className="relative inline-flex">
        <input
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          data-testid={testId}
          aria-label={label}
        />
        <span className={`${track} rounded-full bg-ink-700 transition peer-checked:bg-signal peer-focus-visible:ring-2 peer-focus-visible:ring-signal/60`} />
        <span className={`absolute left-0.5 top-0.5 ${knob} rounded-full bg-white shadow transition`} />
      </span>
    </label>
  );
}
