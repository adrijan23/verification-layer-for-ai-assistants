'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { approveWithFallback, approveWithPasskey, passkeyErrorMessage } from '@/lib/passkey-client';

interface Msg {
  id: string;
  kind: 'sms' | 'approval';
  sender: string;
  title: string;
  body: string;
  link: string | null;
  platformId: string | null;
  confirmationId: string | null;
  confirmationStatus: string | null;
  createdAt: string;
}
interface Grant {
  id: string;
  platformId: string;
  agentName: string;
  createdAt: string;
}
type Brand = { name: string; color: string; accent: string; mark: string };

interface Props {
  embed: boolean;
  ownerEmail: string;
  ownerName: string;
  appName: string;
  brands: Record<string, Brand>;
  fallbackEnabled: boolean;
}

function useClock() {
  const [t, setT] = useState('');
  useEffect(() => {
    const f = () => setT(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
    f();
    const i = setInterval(f, 10_000);
    return () => clearInterval(i);
  }, []);
  return t;
}

function timeOf(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export function Phone(props: Props) {
  const clock = useClock();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [tab, setTab] = useState<'messages' | 'assistants'>('messages');
  const [sheet, setSheet] = useState<string | null>(null);
  const [toast, setToast] = useState<Msg | null>(null);
  const [buzz, setBuzz] = useState(0);
  const [grants, setGrants] = useState<Grant[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const listRef = useRef<HTMLDivElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();

  const loadGrants = useCallback(() => {
    fetch(`/api/grants?email=${encodeURIComponent(props.ownerEmail)}`)
      .then((r) => r.json())
      .then((j) => setGrants(j.grants ?? []))
      .catch(() => null);
  }, [props.ownerEmail]);

  useEffect(() => {
    loadGrants();
    const es = new EventSource('/api/phone/stream');
    es.onmessage = (ev) => {
      const data = JSON.parse(ev.data);
      if (data.type === 'backlog') setMsgs(data.messages);
      else if (data.type === 'message') {
        setMsgs((m) => [...m.filter((x) => x.id !== data.message.id), data.message]);
        setToast(data.message);
        setBuzz(1);
        setTimeout(() => setBuzz(0), 900);
        clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setToast(null), 4500);
      } else if (data.type === 'update') {
        setMsgs((m) => m.map((x) => (x.id === data.message.id ? data.message : x)));
      } else if (data.type === 'state') {
        loadGrants();
        if (data.reason === 'reset') {
          setMsgs([]);
          setSheet(null);
        }
      }
    };
    const onMsg = (e: MessageEvent) => {
      if (e.data?.type === 'agentgate:connected') {
        loadGrants();
        setTimeout(() => setSheet(null), 1600);
      }
    };
    window.addEventListener('message', onMsg);
    return () => {
      es.close();
      window.removeEventListener('message', onMsg);
    };
  }, [loadGrants]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [msgs.length, tab]);

  async function decide(m: Msg, approve: boolean, fallback = false, forceRegister = false) {
    if (!m.confirmationId) return;
    setBusyId(m.id);
    setErrors((e) => ({ ...e, [m.id]: '' }));
    try {
      let assertionToken: string | undefined;
      if (approve) {
        const subject = { confirmationId: m.confirmationId };
        assertionToken = fallback ? await approveWithFallback(subject) : await approveWithPasskey(subject, props.ownerEmail, { forceRegister });
      }
      const res = await fetch(`/api/confirmations/${m.confirmationId}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ approve, assertionToken }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok && res.status !== 409) throw new Error(j.message ?? 'Failed');
    } catch (e) {
      setErrors((x) => ({ ...x, [m.id]: passkeyErrorMessage(e) }));
    } finally {
      setBusyId(null);
    }
  }

  async function revoke(id: string) {
    await fetch(`/api/grants/${id}/revoke`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ by: 'phone' }) });
    loadGrants();
  }

  const brandOf = (id: string | null) => (id ? props.brands[id] : undefined);

  const screen = (
    <div
      className={`relative flex h-[780px] w-[372px] flex-col overflow-hidden rounded-[48px] border-[10px] border-[#1a1d24] bg-[#F2F3F7] shadow-[0_30px_80px_-20px_rgba(0,0,0,.7),0_0_0_2px_#2b2f38] ${buzz ? 'animate-buzz' : ''}`}
      data-testid="phone"
    >
      {/* status bar */}
      <div className="relative z-30 flex h-11 shrink-0 items-center justify-between px-7 text-[13px] font-semibold text-[#111]">
        <span className="tabular">{clock}</span>
        <span className="absolute left-1/2 top-2 h-7 w-28 -translate-x-1/2 rounded-full bg-black" />
        <span className="flex items-center gap-1.5">
          <svg viewBox="0 0 18 12" className="h-3 w-4" fill="currentColor">
            <rect x="0" y="8" width="3" height="4" rx="1" />
            <rect x="5" y="5.5" width="3" height="6.5" rx="1" />
            <rect x="10" y="3" width="3" height="9" rx="1" />
            <rect x="15" y="0" width="3" height="12" rx="1" />
          </svg>
          <svg viewBox="0 0 26 12" className="h-3 w-6">
            <rect x="0.5" y="0.5" width="22" height="11" rx="3" fill="none" stroke="currentColor" opacity=".4" />
            <rect x="2" y="2" width="16" height="8" rx="2" fill="currentColor" />
            <rect x="23.5" y="4" width="2" height="4" rx="1" fill="currentColor" opacity=".4" />
          </svg>
        </span>
      </div>

      {/* notification banner */}
      {toast && (
        <button
          onClick={() => {
            setTab('messages');
            setToast(null);
          }}
          className="absolute left-2 right-2 top-12 z-40 flex animate-slidein items-start gap-3 rounded-2xl bg-white/90 p-3 text-left shadow-xl backdrop-blur"
          data-testid="phone-toast"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#111722] text-sm text-white">
            {toast.kind === 'approval' ? brandOf(toast.platformId)?.mark ?? '!' : '✦'}
          </span>
          <span className="min-w-0">
            <span className="flex justify-between text-[11px] text-[#6b7280]">
              <b className="uppercase tracking-wide text-[#111]">{toast.kind === 'approval' ? props.appName : toast.sender}</b> now
            </span>
            <span className="block truncate text-[13px] font-semibold text-[#111]">{toast.title}</span>
          </span>
        </button>
      )}

      {/* header */}
      <div className="shrink-0 border-b border-black/5 bg-[#F8F8FB]/90 px-4 pb-2 pt-1 text-center">
        {tab === 'messages' ? (
          <>
            <span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-[#2a3446] to-[#111722] text-lg text-white">✦</span>
            <p className="mt-1 text-[12px] font-medium text-[#111]">Instinct · your assistant</p>
          </>
        ) : (
          <p className="py-3 text-[15px] font-semibold text-[#111]">Connected assistants</p>
        )}
      </div>

      {/* content */}
      <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto px-3 py-3" data-testid="phone-messages">
        {tab === 'messages' ? (
          msgs.length === 0 ? (
            <p className="mt-24 text-center text-[13px] text-[#8e8e93]">No messages yet.</p>
          ) : (
            <div className="space-y-3">
              {msgs.map((m) =>
                m.kind === 'sms' ? (
                  <div key={m.id} className="flex animate-slidein flex-col items-start" data-testid="phone-sms">
                    <div className="max-w-[85%] rounded-[20px] rounded-bl-md bg-white px-3.5 py-2.5 text-[14px] leading-snug text-[#111] shadow-sm">
                      <p className="font-semibold">{m.title}</p>
                      <p className="mt-0.5 text-[#333]">{m.body}</p>
                      {m.link && (
                        <button
                          onClick={() => setSheet(`${m.link}&embed=1`)}
                          data-testid="phone-sms-link"
                          className="mt-2 flex w-full items-center gap-2 overflow-hidden rounded-xl bg-[#F2F3F7] p-2 text-left"
                        >
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[10px] font-bold text-white" style={{ background: brandOf(m.platformId)?.color ?? '#111722' }}>
                            {brandOf(m.platformId)?.mark ?? '↗'}
                          </span>
                          <span className="min-w-0">
                            <span className="block text-[12px] font-semibold">Connect your assistant</span>
                            <span className="block truncate text-[11px] text-[#6b7280]">{m.link.replace(/^https?:\/\//, '')}</span>
                          </span>
                        </button>
                      )}
                    </div>
                    <span className="ml-2 mt-0.5 text-[10px] text-[#8e8e93]">{timeOf(m.createdAt)}</span>
                  </div>
                ) : (
                  <ApprovalCard
                    key={m.id}
                    m={m}
                    brand={brandOf(m.platformId)}
                    appName={props.appName}
                    busy={busyId === m.id}
                    error={errors[m.id]}
                    fallbackEnabled={props.fallbackEnabled}
                    onDecide={(approve, fb, reg) => decide(m, approve, fb, reg)}
                  />
                ),
              )}
            </div>
          )
        ) : (
          <div className="space-y-2" data-testid="phone-assistants">
            {grants.length === 0 && <p className="mt-16 text-center text-[13px] text-[#8e8e93]">No assistants connected.</p>}
            {grants.map((g) => {
              const b = brandOf(g.platformId);
              return (
                <div key={g.id} className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm">
                  <span className="grid h-10 w-10 place-items-center rounded-xl text-[11px] font-bold text-white" style={{ background: b?.color }}>
                    {b?.mark}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-semibold text-[#111]">{g.agentName}</span>
                    <span className="block text-[12px] text-[#6b7280]">on {b?.name}</span>
                  </span>
                  <button
                    onClick={() => revoke(g.id)}
                    data-testid={`phone-revoke-${g.platformId}`}
                    className="rounded-full bg-[#FDECEA] px-3 py-1.5 text-[12px] font-semibold text-[#C0392B]"
                  >
                    Revoke
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* tab bar */}
      <div className="flex shrink-0 justify-around border-t border-black/5 bg-[#F8F8FB] pb-6 pt-2 text-[10px] font-medium">
        {(['messages', 'assistants'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={tab === t ? 'text-[#007AFF]' : 'text-[#8e8e93]'} data-testid={`phone-tab-${t}`}>
            <svg viewBox="0 0 24 24" className="mx-auto mb-0.5 h-6 w-6" fill="currentColor" aria-hidden>
              {t === 'messages' ? (
                <path d="M12 3C6.5 3 2 6.6 2 11c0 2.5 1.4 4.7 3.6 6.2L5 21l4-2.2c1 .3 2 .4 3 .4 5.5 0 10-3.6 10-8.1S17.5 3 12 3z" />
              ) : (
                <path d="M12 2 4 5v6.1c0 5 3.4 9.6 8 10.9 4.6-1.3 8-5.9 8-10.9V5z" />
              )}
            </svg>
            {t === 'messages' ? 'Messages' : 'Assistants'}
          </button>
        ))}
      </div>

      {/* in-phone browser sheet for the connect link */}
      {sheet && (
        <div className="absolute inset-0 z-50 flex animate-slidein flex-col bg-white pt-11" data-testid="phone-sheet">
          <div className="flex items-center gap-2 border-b border-black/10 bg-[#F8F8FB] px-3 py-2">
            <button onClick={() => setSheet(null)} className="text-[14px] font-semibold text-[#007AFF]" data-testid="phone-sheet-close">
              Done
            </button>
            <span className="flex-1 truncate rounded-lg bg-[#E9E9EE] px-2 py-1 text-center text-[11px] text-[#555]">🔒 localhost:3000</span>
          </div>
          <iframe
            src={sheet}
            title="Connect your assistant"
            className="min-h-0 flex-1"
            allow="publickey-credentials-get *; publickey-credentials-create *"
            data-testid="phone-connect-frame"
          />
        </div>
      )}
    </div>
  );

  if (props.embed) return <FitToViewport>{screen}</FitToViewport>;
  return (
    <div className="grid min-h-screen place-items-center bg-[radial-gradient(1200px_600px_at_50%_-10%,#1C2433,#0B0F17)] p-6">
      <div className="flex flex-col items-center gap-4">
        {screen}
        <p className="text-xs text-ink-400">
          {props.ownerName}’s phone · simulated
        </p>
      </div>
    </div>
  );
}

/** Stage embed: scale the 392×800 device down so it always fits the iframe (laptops, projectors). */
function FitToViewport({ children }: { children: React.ReactNode }) {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const fit = () => setScale(Math.min(1, (window.innerHeight - 24) / 800, (window.innerWidth - 16) / 392));
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);
  return (
    <div className="grid h-screen place-items-center overflow-hidden bg-transparent">
      <div style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }}>{children}</div>
    </div>
  );
}

function ApprovalCard({
  m,
  brand,
  appName,
  busy,
  error,
  fallbackEnabled,
  onDecide,
}: {
  m: Msg;
  brand?: Brand;
  appName: string;
  busy: boolean;
  error?: string;
  fallbackEnabled: boolean;
  onDecide: (approve: boolean, fallback?: boolean, forceRegister?: boolean) => void;
}) {
  const status = m.confirmationStatus ?? 'pending';
  return (
    <div className="animate-slidein overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-black/5" data-testid="phone-approval" data-status={status}>
      <div className="flex items-center gap-2 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-white" style={{ background: brand?.color ?? '#111722' }}>
        <span>{brand?.name ?? 'Approval'}</span>
        <span className="ml-auto flex items-center gap-1 opacity-80">
          <svg viewBox="0 0 32 32" className="h-3 w-3" aria-hidden>
            <path d="M16 2.5 4.5 7v8.2c0 7.1 4.9 12.4 11.5 14.3 6.6-1.9 11.5-7.2 11.5-14.3V7z" fill="#19C3A6" />
          </svg>
          {appName}
        </span>
      </div>
      <div className="p-3.5">
        <p className="text-[15px] font-semibold leading-snug text-[#111]">{m.title}</p>
        <p className="mt-1 text-[13px] leading-snug text-[#4b5563]">{m.body}</p>
        {status === 'pending' ? (
          <>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                disabled={busy}
                onClick={() => onDecide(false)}
                data-testid="phone-deny"
                className="rounded-xl bg-[#F2F3F7] py-2.5 text-[14px] font-semibold text-[#C0392B] disabled:opacity-50"
              >
                Deny
              </button>
              <button
                disabled={busy}
                onClick={() => onDecide(true)}
                data-testid="phone-approve"
                className="rounded-xl bg-[#111722] py-2.5 text-[14px] font-semibold text-white disabled:opacity-50"
              >
                {busy ? '…' : 'Approve'}
              </button>
            </div>
            <p className="mt-2 text-center text-[11px] text-[#8e8e93]">Approve requires Face ID / Touch ID</p>
            {fallbackEnabled && (
              <button onClick={() => onDecide(true, true)} disabled={busy} data-testid="phone-approve-fallback" className="mt-1 w-full text-center text-[10px] text-[#a1a1aa] underline-offset-2 hover:underline">
                demo fallback
              </button>
            )}
          </>
        ) : (
          <p
            className={`mt-3 rounded-xl py-2 text-center text-[13px] font-semibold ${
              status === 'approved' ? 'bg-[#E8F8EE] text-[#15803D]' : status === 'denied' ? 'bg-[#FDECEA] text-[#C0392B]' : 'bg-[#F2F3F7] text-[#6b7280]'
            }`}
            data-testid="phone-approval-status"
          >
            {status === 'approved' ? '✓ Approved' : status === 'denied' ? 'Denied' : 'Expired'}
          </p>
        )}
        {error && (
          <>
            <p className="mt-2 text-[12px] text-[#C0392B]">{error}</p>
            {status === 'pending' && (
              <button onClick={() => onDecide(true, false, true)} disabled={busy} data-testid="phone-approve-register" className="mt-1 w-full rounded-xl border border-black/10 py-2 text-[12px] font-semibold text-[#111]">
                Use a new passkey on this device
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
