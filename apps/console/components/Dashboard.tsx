'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DashboardSnapshot } from '@/lib/snapshot';
import { DecisionPill, Panel, PlatformMark, ShieldMark, Toggle } from './ui';

type AuditEvent = DashboardSnapshot['audit'][number];

function eur(n: number) {
  return `€${Math.round(n).toLocaleString('en-US')}`;
}
function hms(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function useCountUp(value: number) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / 700);
      const eased = 1 - Math.pow(1 - k, 3);
      setShown(a + (value - a) * eased);
      if (k < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return shown;
}

function Kpi({
  label,
  short,
  value,
  hint,
  tone,
  money,
  testId,
  compact,
}: {
  label: string;
  short: string;
  value: number;
  hint: string;
  tone: string;
  money?: boolean;
  testId: string;
  compact: boolean;
}) {
  const v = useCountUp(value);
  return (
    <div className={`min-w-0 rounded-xl border border-ink-800 bg-ink-900 ${compact ? 'px-2.5 py-2' : 'px-4 py-3'}`} title={hint}>
      <p className={`truncate font-semibold uppercase text-ink-400 ${compact ? 'text-[10px] tracking-wide' : 'text-[11px] tracking-[0.14em]'}`}>{compact ? short : label}</p>
      <p className={`font-semibold tabular ${tone} ${compact ? 'text-xl' : 'mt-1 text-3xl'}`} data-testid={testId}>
        {money ? eur(v) : Math.round(v).toLocaleString('en-US')}
      </p>
      {!compact && <p className="truncate text-xs text-ink-500">{hint}</p>}
    </div>
  );
}

interface FeedItem {
  key: string;
  event: AuditEvent;
  count: number;
}

function buildFeed(events: AuditEvent[]): FeedItem[] {
  const out: FeedItem[] = [];
  for (const e of events) {
    const prev = out[out.length - 1];
    // Collapse bursts: throttles, and repeated searches with the same outcome.
    const collapsible = e.decision === 'throttle' || e.action.endsWith('.search');
    if (prev && collapsible && prev.event.decision === e.decision && prev.event.agentSessionId === e.agentSessionId && prev.event.action === e.action) {
      prev.count += 1;
      continue;
    }
    out.push({ key: String(e.seq), event: e, count: 1 });
  }
  return out;
}

export function Dashboard({ initial, compact }: { initial: DashboardSnapshot; compact: boolean }) {
  const [snap, setSnap] = useState(initial);
  const [events, setEvents] = useState<AuditEvent[]>(initial.audit);
  const [live, setLive] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const refreshTimer = useRef<ReturnType<typeof setTimeout>>();

  const refresh = useCallback(() => {
    clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(async () => {
      const s = (await fetch('/api/dashboard').then((r) => r.json())) as DashboardSnapshot;
      setSnap(s);
      setEvents((cur) => {
        const known = new Set(s.audit.map((e) => e.seq));
        const extra = cur.filter((e) => !known.has(e.seq) && e.seq > (s.audit[0]?.seq ?? 0));
        return [...extra, ...s.audit].slice(0, 200);
      });
    }, 250);
  }, []);

  useEffect(() => {
    const es = new EventSource('/api/events/stream');
    es.onopen = () => setLive(true);
    es.onerror = () => setLive(false);
    es.onmessage = (ev) => {
      const data = JSON.parse(ev.data);
      if (data.type === 'audit') {
        setEvents((cur) => (cur.some((e) => e.seq === data.event.seq) ? cur : [data.event, ...cur].slice(0, 200)));
      }
      refresh();
    };
    return () => es.close();
  }, [refresh]);

  const feed = useMemo(() => buildFeed(events), [events]);
  const platformById = useMemo(() => Object.fromEntries(snap.platforms.map((p) => [p.id, p])), [snap.platforms]);
  const activeGrants = snap.grants.filter((g) => !g.revokedAt);

  async function toggleGateway(id: string, enabled: boolean) {
    setSnap((s) => ({ ...s, platforms: s.platforms.map((p) => (p.id === id ? { ...p, gatewayEnabled: enabled } : p)) }));
    await fetch(`/api/platforms/${id}/gateway`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ enabled }) });
    refresh();
  }
  async function toggleShadow(id: string, enabled: boolean) {
    setSnap((s) => ({ ...s, platforms: s.platforms.map((p) => (p.id === id ? { ...p, shadowMode: enabled } : p)) }));
    await fetch(`/api/platforms/${id}/shadow`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ enabled }) });
    refresh();
  }
  async function act(name: string, fn: () => Promise<unknown>) {
    setBusy(name);
    try {
      await fn();
    } finally {
      setBusy(null);
      refresh();
    }
  }

  const t = snap.totals;
  const chainOk = snap.chain.ok;

  return (
    <div className={`min-h-screen bg-ink-950 ${compact ? 'text-[13px]' : ''}`} data-testid="dashboard">
      {/* top bar */}
      <header className="sticky top-0 z-20 border-b border-ink-800 bg-ink-950/90 backdrop-blur">
        <div className={`mx-auto flex max-w-[1500px] flex-wrap items-center gap-3 ${compact ? 'px-3 py-2' : 'px-6 py-3'}`}>
          <ShieldMark />
          <div className="mr-auto leading-tight">
            <p className="font-semibold tracking-tight text-ink-50">{snap.displayName}</p>
            {!compact && <p className="text-xs text-ink-400">Agent trust console · platform side</p>}
          </div>
          <span className={`flex items-center gap-1.5 text-xs ${live ? 'text-signal' : 'text-ink-500'}`}>
            <span className={`h-2 w-2 rounded-full ${live ? 'animate-pulse bg-signal' : 'bg-ink-600'}`} />
            {live ? 'Live' : 'Connecting'}
          </span>
          <span
            data-testid="chain-badge"
            data-ok={chainOk}
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${chainOk ? 'bg-signal-soft text-signal ring-signal/30' : 'bg-deny/15 text-deny ring-deny/40'}`}
          >
            {chainOk ? `Chain verified ✓ · ${snap.chain.count} events` : `Chain broken at #${snap.chain.brokenAtSeq}`}
          </span>
          <button
            data-testid="reset-demo"
            disabled={busy === 'reset'}
            onClick={() =>
              act('reset', async () => {
                await fetch('/api/demo/reset', { method: 'POST' });
                setEvents([]);
              })
            }
            className="rounded-lg border border-ink-700 px-3 py-1.5 text-xs font-semibold text-ink-200 hover:border-ink-500 hover:text-white disabled:opacity-50"
          >
            {busy === 'reset' ? 'Resetting…' : 'Reset demo'}
          </button>
        </div>
      </header>

      <main className={`mx-auto max-w-[1500px] space-y-4 ${compact ? 'px-3 py-3' : 'px-6 py-5'}`}>
        {/* KPIs: revenue owner + risk owner */}
        <div className={`grid ${compact ? 'grid-cols-5 gap-2' : 'grid-cols-2 gap-3 lg:grid-cols-5'}`}>
          <Kpi compact={compact} label="Agent revenue recovered" short="Revenue" value={t.revenue} money hint="Completed agent purchases" tone="text-signal" testId="kpi-revenue" />
          <Kpi compact={compact} label="Agent transactions" short="Purchases" value={t.completed} hint="Purchases completed (card + miles)" tone="text-ink-50" testId="kpi-completed" />
          <Kpi compact={compact} label="Risky actions blocked" short="Blocked" value={t.blocked} hint="Guardrails, limits, user denials" tone="text-deny" testId="kpi-blocked" />
          <Kpi compact={compact} label="Confirmations" short="Confirm" value={t.confirmations} hint="Sent to the customer’s phone" tone="text-confirm" testId="kpi-confirmations" />
          <Kpi compact={compact} label="Throttled" short="Throttled" value={t.throttled} hint="Abusive request bursts" tone="text-throttle" testId="kpi-throttled" />
        </div>

        {/* platforms */}
        {compact && (
          <div className="grid grid-cols-2 gap-2">
            {snap.platforms.map((p) => (
              <section key={p.id} className="flex min-w-0 items-center gap-2 rounded-xl border border-ink-800 bg-ink-900 px-3 py-2" data-testid={`platform-${p.id}`}>
                <PlatformMark size="sm" mark={p.brand.mark} color={p.brand.color} accent={p.brand.accent} />
                <div className="mr-auto min-w-0 leading-tight">
                  <p className="truncate text-sm font-semibold text-ink-50" title={p.name}>
                    {p.name.split(' ')[0]}
                  </p>
                  <p className={`text-[10px] font-bold uppercase tracking-wider ${p.gatewayEnabled ? 'text-signal' : 'text-ink-500'}`} data-testid={`gateway-state-${p.id}`}>
                    Gateway {p.gatewayEnabled ? 'ON' : 'OFF'}
                    {p.shadowMode ? ' · shadow' : ''}
                  </p>
                </div>
                <Toggle checked={p.gatewayEnabled} onChange={(v) => toggleGateway(p.id, v)} label={`Gateway for ${p.name}`} testId={`gateway-${p.id}`} />
              </section>
            ))}
          </div>
        )}
        <div className={`grid gap-3 ${compact ? 'hidden' : 'md:grid-cols-2'}`}>
          {!compact && snap.platforms.map((p) => (
            <section key={p.id} className="rounded-xl border border-ink-800 bg-ink-900 p-4" data-testid={`platform-${p.id}`}>
              <div className="flex flex-wrap items-center gap-3">
                <PlatformMark mark={p.brand.mark} color={p.brand.color} accent={p.brand.accent} />
                <div className="mr-auto min-w-0">
                  <p className="font-semibold text-ink-50">{p.name}</p>
                  <p className="font-mono text-xs text-ink-500">{p.publicUrl.replace('http://', '')}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-2 text-xs text-ink-400">
                    Shadow
                    <Toggle size="sm" checked={p.shadowMode} onChange={(v) => toggleShadow(p.id, v)} label={`Shadow mode for ${p.name}`} testId={`shadow-${p.id}`} />
                  </span>
                  <span className="flex items-center gap-2">
                    <span className={`text-xs font-bold uppercase tracking-wider ${p.gatewayEnabled ? 'text-signal' : 'text-ink-500'}`} data-testid={`gateway-state-${p.id}`}>
                      Gateway {p.gatewayEnabled ? 'ON' : 'OFF'}
                    </span>
                    <Toggle checked={p.gatewayEnabled} onChange={(v) => toggleGateway(p.id, v)} label={`Gateway for ${p.name}`} testId={`gateway-${p.id}`} />
                  </span>
                </div>
              </div>
              <dl className="mt-4 grid grid-cols-3 gap-x-4 gap-y-3 sm:grid-cols-6">
                {[
                  ['Revenue', eur(p.stats.revenue), 'text-signal'],
                  ['Allowed', p.stats.allowed, 'text-allow'],
                  ['Blocked', p.stats.blocked, 'text-deny'],
                  ['Confirm', p.stats.confirmations, 'text-confirm'],
                  ['Throttled', p.stats.throttled, 'text-throttle'],
                  [p.gatewayEnabled ? 'Sessions' : 'Bot-blocked', p.gatewayEnabled ? p.stats.sessions : p.stats.legacyBlocked, p.gatewayEnabled ? 'text-ink-100' : 'text-deny'],
                ].map(([k, v, tone]) => (
                  <div key={String(k)} className="min-w-0">
                    <dt className="truncate text-[11px] uppercase tracking-wider text-ink-500">{k}</dt>
                    <dd className={`text-lg font-semibold tabular ${tone}`}>{v}</dd>
                  </div>
                ))}
              </dl>
              {p.shadowMode && <p className="mt-3 rounded-md bg-confirm/10 px-3 py-1.5 text-xs text-confirm">Shadow mode: decisions are logged, not enforced.</p>}
            </section>
          ))}
        </div>

        <div className={`grid gap-4 ${compact ? '' : 'xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]'}`}>
          {/* live decision feed */}
          <Panel title="Live agent decisions" right={<span className="text-xs text-ink-500 tabular">{events.length} recent</span>}>
            <div className={`overflow-y-auto ${compact ? 'max-h-[calc(100vh-250px)] min-h-[300px]' : 'max-h-[620px]'}`} data-testid="feed">
              {feed.length === 0 ? (
                <p className="px-4 py-16 text-center text-sm text-ink-500">No agent traffic yet. Decisions appear here as they happen.</p>
              ) : (
                <ul className="divide-y divide-ink-800">
                  {feed.map(({ key, event: e, count }) => {
                    const p = platformById[e.platformId];
                    return (
                      <li key={key} className="grid animate-rowin grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 px-4 py-2.5" data-testid="feed-row" data-action={e.action} data-decision={e.decision}>
                        <div className="flex flex-col items-center gap-1 pt-0.5">
                          {p && <PlatformMark size="sm" mark={p.brand.mark} color={p.brand.color} accent={p.brand.accent} />}
                        </div>
                        <div className="min-w-0">
                          <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
                            <span className="font-semibold text-ink-50">{snap.labels[e.action] ?? e.action}</span>
                            {e.summary && <span className="text-ink-200 tabular">{e.summary}</span>}
                            {count > 1 && <span className="rounded bg-ink-800 px-1.5 text-xs font-semibold text-ink-200">×{count}</span>}
                            {!e.enforced && <span className="rounded bg-confirm/15 px-1.5 text-[10px] font-semibold uppercase text-confirm">shadow</span>}
                          </p>
                          <p className="truncate text-xs text-ink-400" title={e.message}>
                            {e.message}
                          </p>
                          <p className="mt-0.5 font-mono text-[11px] text-ink-600">
                            {hms(e.ts)} · {e.agentName ?? 'agent'} · {e.action} · {e.reason}
                          </p>
                        </div>
                        <DecisionPill decision={e.decision} />
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </Panel>

          <div className="min-w-0 space-y-4">
            {/* grants */}
            <Panel title="Connected assistants" right={<span className="text-xs text-ink-500">{activeGrants.length} active</span>}>
              {snap.grants.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-ink-500">No assistant has been connected yet.</p>
              ) : (
                <ul className="divide-y divide-ink-800" data-testid="grants">
                  {snap.grants.slice(0, 6).map((g) => {
                    const p = platformById[g.platformId];
                    return (
                      <li key={g.id} className={`px-4 py-3 ${g.revokedAt ? 'opacity-50' : ''}`} data-testid={`grant-${g.platformId}`}>
                        <div className="flex items-center gap-3">
                          {p && <PlatformMark size="sm" mark={p.brand.mark} color={p.brand.color} accent={p.brand.accent} />}
                          <div className="mr-auto min-w-0">
                            <p className="text-sm font-semibold text-ink-50">
                              {g.agentName} <span className="font-normal text-ink-400">for {g.userName}</span>
                            </p>
                            <p className="text-xs text-ink-500">{g.platformName}</p>
                          </div>
                          {g.revokedAt ? (
                            <span className="text-xs font-semibold uppercase text-ink-500">Revoked</span>
                          ) : (
                            <button
                              data-testid={`revoke-${g.platformId}`}
                              onClick={() => act(`revoke-${g.id}`, () => fetch(`/api/grants/${g.id}/revoke`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"by":"dashboard"}' }))}
                              className="rounded-md border border-deny/40 px-2.5 py-1 text-xs font-semibold text-deny hover:bg-deny/10"
                            >
                              Revoke
                            </button>
                          )}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {g.permissions.map((perm) => (
                            <span
                              key={perm.action}
                              className={`rounded px-1.5 py-0.5 text-[11px] ${perm.mode === 'allow' ? 'bg-allow/10 text-allow' : perm.mode === 'confirm' ? 'bg-confirm/10 text-confirm' : 'bg-deny/10 text-deny'}`}
                            >
                              {perm.label}
                              {perm.limit?.amount !== undefined && perm.mode === 'allow' ? ` ≤ ${eur(perm.limit.amount)}` : ''}
                              {perm.mode === 'confirm' ? ' · ask' : perm.mode === 'deny' ? ' · never' : ''}
                            </span>
                          ))}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>

            {/* audit */}
            <Panel
              title="Tamper-evident audit log"
              right={
                <div className="flex items-center gap-2">
                  {snap.demoTools && (
                    <button
                      data-testid="tamper"
                      onClick={() => act('tamper', () => fetch('/api/demo/tamper', { method: 'POST' }))}
                      className="rounded-md px-2 py-1 text-[11px] text-ink-500 hover:text-deny"
                      title="Demo: edit one row directly in the database"
                    >
                      Simulate tampering
                    </button>
                  )}
                  <button
                    data-testid="verify-chain"
                    onClick={() => act('verify', async () => {
                      const v = await fetch('/api/audit/verify').then((r) => r.json());
                      setSnap((s) => ({ ...s, chain: v }));
                    })}
                    className="rounded-md border border-ink-700 px-2 py-1 text-[11px] font-semibold text-ink-200 hover:border-signal hover:text-signal"
                  >
                    Verify chain
                  </button>
                </div>
              }
            >
              <div className={`px-4 py-3 text-xs ${chainOk ? 'text-signal' : 'text-deny'}`} data-testid="chain-status">
                {chainOk
                  ? `All ${snap.chain.count} events verified. Each row’s SHA-256 includes the previous row’s hash.`
                  : `Chain broken at event #${snap.chain.brokenAtSeq}: a row was modified after it was written.`}
              </div>
              <ul className="max-h-[260px] divide-y divide-ink-800 overflow-y-auto border-t border-ink-800 font-mono text-[11px]" data-testid="audit-list">
                {events.slice(0, 40).map((e) => {
                  const broken = !chainOk && snap.chain.brokenAtSeq === e.seq;
                  return (
                    <li key={e.seq} className={`grid grid-cols-[3rem_minmax(0,1fr)_auto] gap-2 px-4 py-1.5 ${broken ? 'bg-deny/15 text-deny' : 'text-ink-400'}`}>
                      <span className="text-ink-500">#{e.seq}</span>
                      <span className="truncate">
                        <span className="text-ink-200">{e.action}</span> → {e.decision}
                      </span>
                      <span className="text-ink-600" title={e.hash}>
                        {e.hash.slice(0, 10)}…
                      </span>
                    </li>
                  );
                })}
              </ul>
            </Panel>
          </div>
        </div>
      </main>
    </div>
  );
}
