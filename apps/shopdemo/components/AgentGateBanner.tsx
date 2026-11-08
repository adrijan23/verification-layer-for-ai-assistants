'use client';

import { useEffect, useState } from 'react';
import type { ApiError } from '@/lib/api';

const STYLES: Record<string, { title: string; tone: string; dot: string }> = {
  agent_connect_required: { title: 'Assistant not connected to this account', tone: 'border-sky-300 bg-[#EAF2FF] text-[#0B3A8C]', dot: 'bg-[#2F6FED]' },
  agent_action_denied: { title: 'Action blocked by account security', tone: 'border-red-200 bg-red-50 text-red-900', dot: 'bg-red-600' },
  agent_action_denied_by_user: { title: 'Declined by the account holder', tone: 'border-red-200 bg-red-50 text-red-900', dot: 'bg-red-600' },
  agent_rate_limited: { title: 'Too many requests from this assistant', tone: 'border-slate-300 bg-slate-100 text-slate-800', dot: 'bg-slate-500' },
};

/** Renders gateway errors (agent_*) returned to API calls made by this page. */
export function AgentGateBanner() {
  const [err, setErr] = useState<ApiError | null>(null);

  useEffect(() => {
    const on = (e: Event) => setErr((e as CustomEvent<ApiError>).detail);
    window.addEventListener('agentgate:error', on);
    return () => window.removeEventListener('agentgate:error', on);
  }, []);

  if (!err) return null;
  const s = STYLES[err.error] ?? STYLES.agent_action_denied;
  return (
    <div data-testid="agentgate-banner" data-error={err.error} className={`border-b ${s.tone}`}>
      <div className="mx-auto flex max-w-7xl items-start gap-3 px-4 py-3 sm:px-6">
        <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${s.dot}`} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{s.title}</p>
          <p className="text-sm opacity-90">{err.message}</p>
          {err.connectUrl && (
            <a href={err.connectUrl} className="mt-1 inline-block break-all text-sm font-medium underline" data-testid="agentgate-connect-link">
              Approve this assistant
            </a>
          )}
        </div>
        <span className="hidden text-xs uppercase tracking-wider opacity-60 sm:block">Protected by AgentGate</span>
        <button onClick={() => setErr(null)} className="text-sm opacity-60 hover:opacity-100" aria-label="Dismiss">
          ✕
        </button>
      </div>
    </div>
  );
}
