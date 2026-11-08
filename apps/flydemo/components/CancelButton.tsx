'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { apiFetch } from '@/lib/api';

export function CancelButton({ bookingId, refundAmount }: { bookingId: string; refundAmount: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="text-right">
      <button
        data-testid={`cancel-${bookingId}`}
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const r = await apiFetch(`/api/bookings/${bookingId}/cancel`, { method: 'POST', body: JSON.stringify({ refundAmount }) });
          setBusy(false);
          if (r.ok) router.refresh();
          else setErr(r.error.message);
        }}
        className="rounded-lg border border-navy-900 px-4 py-2 text-sm font-semibold hover:bg-navy-900 hover:text-white disabled:opacity-60"
      >
        {busy ? 'Cancelling…' : 'Cancel & refund'}
      </button>
      {err && <p className="mt-1 max-w-[240px] text-xs text-red-700">{err}</p>}
    </div>
  );
}
