import { summarizeParams } from '@agentgate/shared';
import { subscribe } from '@/lib/bus';
import { sseResponse } from '@/lib/sse';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Live audit events + state-change pings for the dashboard. */
export function GET(req: Request) {
  return sseResponse(req, (send) =>
    subscribe((e) => {
      if (e.type === 'audit') send({ type: 'audit', event: { ...e.event, summary: summarizeParams(e.event.params) } });
      else if (e.type === 'state' || e.type === 'confirmation') send({ type: 'state', reason: e.type === 'state' ? e.reason : 'confirmation' });
    }),
  );
}
