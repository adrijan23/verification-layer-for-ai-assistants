'use client';

import { useState } from 'react';
import type { Permission } from '@agentgate/shared/client';
import { approveWithFallback, approveWithPasskey, passkeyErrorMessage } from '@/lib/passkey-client';

type Mode = 'allow' | 'confirm' | 'deny';
interface PermRow extends Permission {
  label: string;
  risk: 'read' | 'money' | 'account';
  locked: boolean;
}

interface Props {
  embed: boolean;
  appName: string;
  sid: string;
  platform: { id: string; name: string; brand: { color: string; accent: string; mark: string } };
  agentName: string;
  alreadyConnected: boolean;
  permissions: PermRow[];
  defaultEmail: string;
  defaultPassword: string;
  fallbackEnabled: boolean;
}

const MODES: { key: Mode; label: string }[] = [
  { key: 'allow', label: 'Allow' },
  { key: 'confirm', label: 'Ask me' },
  { key: 'deny', label: 'Never' },
];

function RiskIcon({ risk }: { risk: PermRow['risk'] }) {
  const common = 'h-5 w-5';
  if (risk === 'money')
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="6" width="18" height="12" rx="2" />
        <path d="M3 10h18M7 15h3" />
      </svg>
    );
  if (risk === 'account')
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6" />
      </svg>
    );
  return (
    <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="11" cy="11" r="6" />
      <path d="m20 20-4.5-4.5" />
    </svg>
  );
}

function sentence(p: PermRow): string {
  if (p.locked) return 'Never — blocked by the platform';
  if (p.mode === 'deny') return 'Never';
  if (p.mode === 'confirm') return 'Always ask me first';
  if (p.limit?.amount !== undefined) return `Up to the limit below, above that ${p.overLimit === 'confirm' ? 'ask me' : 'block it'}`;
  return 'Allowed';
}

export function ConnectFlow(props: Props) {
  const { platform, agentName, appName, embed } = props;
  const [step, setStep] = useState<'signin' | 'permissions' | 'done'>(props.alreadyConnected ? 'done' : 'signin');
  const [email, setEmail] = useState(props.defaultEmail);
  const [password, setPassword] = useState(props.defaultPassword);
  const [ticket, setTicket] = useState<string | null>(null);
  const [userName, setUserName] = useState('');
  const [perms, setPerms] = useState<PermRow[]>(props.permissions);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch('/api/connect/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sid: props.sid, platformId: platform.id, email, password }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(json.message ?? 'Sign-in failed');
    setTicket(json.ticket);
    setUserName(json.user.displayName);
    setStep('permissions');
  }

  const [offerRegister, setOfferRegister] = useState(false);

  async function approve(useFallback: boolean, forceRegister = false) {
    if (!ticket) return;
    setBusy(true);
    setError(null);
    try {
      const token = useFallback ? await approveWithFallback({ ticket }) : await approveWithPasskey({ ticket }, email, { forceRegister });
      const res = await fetch('/api/connect/complete', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ticket,
          assertionToken: token,
          permissions: perms.map(({ action, mode, limit, overLimit }) => ({ action, mode, limit, overLimit })),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message ?? 'Could not connect the assistant');
      setStep('done');
      window.parent?.postMessage({ type: 'agentgate:connected', platformId: platform.id }, '*');
    } catch (e) {
      setError(passkeyErrorMessage(e));
      if (!useFallback) setOfferRegister(true);
    } finally {
      setBusy(false);
    }
  }

  const setMode = (i: number, mode: Mode) => setPerms((ps) => ps.map((p, j) => (j === i ? { ...p, mode } : p)));
  const setLimit = (i: number, amount: number) =>
    setPerms((ps) => ps.map((p, j) => (j === i ? { ...p, limit: { ...p.limit, amount } } : p)));

  const accentBtn = { background: platform.brand.color };

  return (
    <div className={`min-h-screen bg-[#F3F5F9] text-[#111722] ${embed ? '' : 'pb-10'}`} style={{ colorScheme: 'light' }} data-testid="connect-page">
      <header style={{ background: platform.brand.color }} className="text-white">
        <div className={`mx-auto flex max-w-xl items-center gap-3 ${embed ? 'px-4 py-3' : 'px-6 py-5'}`}>
          <span
            className="grid h-9 w-9 place-items-center rounded-lg text-xs font-bold"
            style={{ background: 'rgba(255,255,255,.12)', boxShadow: `inset 0 -3px 0 ${platform.brand.accent}` }}
          >
            {platform.brand.mark}
          </span>
          <span className="text-lg font-semibold">{platform.name}</span>
          <span className="ml-auto text-xs text-white/70">Account security</span>
        </div>
      </header>

      <main className={`mx-auto max-w-xl ${embed ? 'px-3 pt-3' : 'px-6 pt-8'}`}>
        <div className="rounded-2xl bg-white p-5 shadow-[0_10px_30px_-18px_rgba(17,23,34,.4)] sm:p-6">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#111722] text-lg text-white" aria-hidden>
              ✦
            </span>
            <div>
              <h1 className={`${embed ? 'text-lg' : 'text-xl'} font-semibold leading-snug`} data-testid="connect-title">
                <b>{agentName}</b> wants to make transactions on your {platform.name} account
              </h1>
              <p className="mt-1 text-sm text-[#5B6880]">You decide what it may do. You can revoke access at any time.</p>
            </div>
          </div>

          <ol className="mt-5 flex gap-2 text-xs font-semibold">
            {['Sign in', 'Permissions', 'Connected'].map((s, i) => {
              const idx = step === 'signin' ? 0 : step === 'permissions' ? 1 : 2;
              return (
                <li key={s} className="flex flex-1 flex-col gap-1.5">
                  <span className="h-1 rounded-full" style={{ background: i <= idx ? platform.brand.color : '#E3E8F0' }} />
                  <span className={i <= idx ? 'text-[#111722]' : 'text-[#8592A8]'}>{s}</span>
                </li>
              );
            })}
          </ol>

          {step === 'signin' && (
            <form onSubmit={signIn} className="mt-5 space-y-3">
              <label className="block text-sm font-medium">
                Email
                <input
                  id="connect-email"
                  data-testid="connect-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#D3DAE5] px-3 py-2.5 outline-none focus:border-[#3B475D]"
                />
              </label>
              <label className="block text-sm font-medium">
                {platform.name} password
                <input
                  id="connect-password"
                  data-testid="connect-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#D3DAE5] px-3 py-2.5 outline-none focus:border-[#3B475D]"
                />
              </label>
              <p className="text-xs text-[#5B6880]">Your password stays with {platform.name}. The assistant never sees it.</p>
              <button
                data-testid="connect-signin"
                disabled={busy}
                className="w-full rounded-xl py-3 font-semibold text-white disabled:opacity-60"
                style={accentBtn}
              >
                {busy ? 'Signing in…' : 'Sign in to continue'}
              </button>
            </form>
          )}

          {step === 'permissions' && (
            <div className="mt-5">
              <p className="text-sm text-[#5B6880]">
                Signed in as <b className="text-[#111722]">{userName}</b>. What may {agentName} do?
              </p>
              <ul className="mt-3 divide-y divide-[#EEF1F6] rounded-xl border border-[#E3E8F0]" data-testid="permission-list">
                {perms.map((p, i) => (
                  <li key={p.action} className="p-3" data-testid={`perm-${p.action}`}>
                    <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
                      <span className={`mt-0.5 ${p.locked ? 'text-[#C0392B]' : 'text-[#3B475D]'}`}>
                        <RiskIcon risk={p.risk} />
                      </span>
                      <div className="min-w-[150px] flex-1">
                        <p className="font-semibold leading-tight">{p.label}</p>
                        <p className="text-xs text-[#5B6880]">{sentence(p)}</p>
                      </div>
                      {p.locked ? (
                        <span className="ml-8 flex items-center gap-1 rounded-full bg-[#FDECEA] px-2 py-1 text-[11px] font-semibold text-[#B03A2E] sm:ml-0">
                          <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor">
                            <path d="M7 10V8a5 5 0 0 1 10 0v2h1a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1zm2 0h6V8a3 3 0 0 0-6 0z" />
                          </svg>
                          Blocked by {platform.name.split(' ')[0]}
                        </span>
                      ) : (
                        <div className="ml-8 flex shrink-0 rounded-lg bg-[#EEF1F6] p-0.5 text-xs font-semibold sm:ml-0">
                          {MODES.map((m) => (
                            <button
                              key={m.key}
                              type="button"
                              data-testid={`perm-${p.action}-${m.key}`}
                              onClick={() => setMode(i, m.key)}
                              className={`rounded-md px-2 py-1 transition ${p.mode === m.key ? 'bg-white text-[#111722] shadow-sm' : 'text-[#5B6880]'}`}
                            >
                              {m.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {!p.locked && p.mode === 'allow' && p.limit?.amount !== undefined && (
                      <div className="ml-8 mt-2 flex items-center gap-2 text-sm">
                        <span className="text-[#5B6880]">Limit per transaction</span>
                        <span className="flex items-center rounded-lg border border-[#D3DAE5] px-2">
                          €
                          <input
                            id={`limit-${p.action}`}
                            data-testid={`limit-${p.action}`}
                            type="number"
                            min={0}
                            step={10}
                            value={p.limit.amount}
                            onChange={(e) => setLimit(i, Number(e.target.value))}
                            className="w-20 bg-white px-1 py-1 text-[#111722] outline-none tabular"
                          />
                        </span>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
              <button
                data-testid="connect-approve"
                disabled={busy}
                onClick={() => approve(false)}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3 font-semibold text-white disabled:opacity-60"
                style={accentBtn}
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                  <path d="M12 11v4M8.5 7.5A5 5 0 0 1 17 11v1M7 11c0 3 .7 5.5 2 7.5M17 14c0 2-.5 4-1.5 5.5M12 3a8 8 0 0 0-8 8v1M20 12v-1a8 8 0 0 0-3-6.2" />
                </svg>
                {busy ? 'Waiting for passkey…' : 'Approve with passkey'}
              </button>
              {offerRegister && (
                <button
                  type="button"
                  data-testid="connect-register"
                  disabled={busy}
                  onClick={() => approve(false, true)}
                  className="mt-2 w-full rounded-xl border border-[#D3DAE5] py-2.5 text-sm font-semibold text-[#111722] disabled:opacity-60"
                >
                  Use a new passkey on this device
                </button>
              )}
              {props.fallbackEnabled && (
                <button
                  type="button"
                  data-testid="connect-fallback"
                  disabled={busy}
                  onClick={() => approve(true)}
                  className="mt-2 w-full text-center text-xs text-[#8592A8] underline-offset-2 hover:underline"
                >
                  Passkey not available on this device? Use demo fallback
                </button>
              )}
            </div>
          )}

          {step === 'done' && (
            <div className="mt-6 text-center" data-testid="connect-done">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#22C55E] text-2xl text-white">✓</span>
              <p className="mt-3 text-xl font-semibold">Assistant connected</p>
              <p className="mt-1 text-sm text-[#5B6880]">
                {agentName} can now act on {platform.name} within the limits you set. You can close this page.
              </p>
            </div>
          )}

          {error && (
            <p className="mt-4 rounded-lg bg-[#FDECEA] px-3 py-2 text-sm text-[#B03A2E]" data-testid="connect-error">
              {error}
            </p>
          )}
        </div>
        <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-[#8592A8]">
          <svg viewBox="0 0 32 32" className="h-3.5 w-3.5" aria-hidden>
            <path d="M16 2.5 4.5 7v8.2c0 7.1 4.9 12.4 11.5 14.3 6.6-1.9 11.5-7.2 11.5-14.3V7z" fill="#19C3A6" />
          </svg>
          Secured by {appName}
        </p>
      </main>
    </div>
  );
}
