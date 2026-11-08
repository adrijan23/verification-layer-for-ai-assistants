'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { apiFetch } from '@/lib/api';

export function AddressForm() {
  const router = useRouter();
  const [address, setAddress] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="mt-4 flex flex-wrap gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const r = await apiFetch('/api/account/address', { method: 'POST', body: JSON.stringify({ address }) });
        setBusy(false);
        if (r.ok) {
          setMsg({ ok: true, text: 'Address updated.' });
          router.refresh();
        } else setMsg({ ok: false, text: r.error.message });
      }}
    >
      <input
        id="new-address"
        data-testid="new-address"
        required
        placeholder="New street address, city"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        className="min-w-0 flex-1 rounded-lg border border-paper-200 bg-paper-50 px-3 py-2.5 outline-none focus:border-night-700"
      />
      <button data-testid="save-address" disabled={busy} className="rounded-full bg-amber-400 px-5 py-2.5 font-bold text-night-900 hover:bg-amber-500 disabled:opacity-60">
        {busy ? 'Saving…' : 'Use this address'}
      </button>
      {msg && (
        <p data-testid="address-result" className={`w-full text-sm ${msg.ok ? 'text-emerald-700' : 'text-red-700'}`}>
          {msg.text}
        </p>
      )}
    </form>
  );
}
