'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { apiFetch } from '@/lib/api';

export function EmailForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="mt-4 flex flex-wrap gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const r = await apiFetch('/api/account/email', { method: 'POST', body: JSON.stringify({ email }) });
        setBusy(false);
        if (r.ok) {
          setMsg({ ok: true, text: 'Email updated.' });
          router.refresh();
        } else setMsg({ ok: false, text: r.error.message });
      }}
    >
      <input
        id="new-email"
        data-testid="new-email"
        type="email"
        required
        placeholder="new.email@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="min-w-0 flex-1 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2.5 outline-none focus:border-navy-700"
      />
      <button
        data-testid="save-email"
        disabled={busy}
        className="rounded-lg bg-navy-900 px-5 py-2.5 font-semibold text-white hover:bg-navy-800 disabled:opacity-60"
      >
        {busy ? 'Saving…' : 'Change email'}
      </button>
      {msg && (
        <p data-testid="email-result" className={`w-full text-sm ${msg.ok ? 'text-emerald-700' : 'text-red-700'}`}>
          {msg.text}
        </p>
      )}
    </form>
  );
}
