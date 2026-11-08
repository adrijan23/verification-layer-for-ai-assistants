'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { apiFetch } from '@/lib/api';

export function ReturnButton({ orderId, amount }: { orderId: string; amount: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="text-right">
      <button
        data-testid={`return-${orderId}`}
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const r = await apiFetch(`/api/orders/${orderId}/return`, { method: 'POST', body: JSON.stringify({ refundAmount: amount }) });
          setBusy(false);
          if (r.ok) router.refresh();
          else setErr(r.error.message);
        }}
        className="rounded-full border border-night-900 px-4 py-2 text-sm font-bold hover:bg-night-900 hover:text-white disabled:opacity-60"
      >
        {busy ? 'Requesting…' : 'Return or refund items'}
      </button>
      {err && <p className="mt-1 max-w-[260px] text-xs text-red-700">{err}</p>}
    </div>
  );
}
