import { subscribe } from '@/lib/bus';
import { listPhoneMessages } from '@/lib/phone';
import { sseResponse } from '@/lib/sse';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export function GET(req: Request) {
  return sseResponse(req, (send) => {
    send({ type: 'backlog', messages: listPhoneMessages(60) });
    return subscribe((e) => {
      if (e.type === 'phone') send({ type: 'message', message: e.message });
      else if (e.type === 'phone_update') send({ type: 'update', message: e.message });
      else if (e.type === 'state') send({ type: 'state', reason: e.reason });
    });
  });
}
