import type { FareClass } from './data';

export interface Booking {
  id: string;
  pnr: string;
  flightId: string;
  fareClass: FareClass;
  date: string;
  payWith: 'card' | 'miles';
  total: number;
  miles: number;
  status: 'ticketed' | 'cancelled';
  bookedBy: string;
  createdAt: string;
  refundAmount?: number;
}

interface State {
  bookings: Booking[];
  milesBalance: number;
  email: string;
  seq: number;
}

type G = typeof globalThis & { __flyState?: State };

function fresh(): State {
  return { bookings: [], milesBalance: 80000, email: 'marko@example.com', seq: 0 };
}

export function state(): State {
  const g = globalThis as G;
  if (!g.__flyState) g.__flyState = fresh();
  return g.__flyState;
}

export function resetState() {
  (globalThis as G).__flyState = fresh();
}

const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
export function nextIds(): { id: string; pnr: string } {
  const s = state();
  s.seq += 1;
  let pnr = '';
  let n = s.seq * 7919 + 104729;
  for (let i = 0; i < 6; i++) {
    pnr += LETTERS[n % LETTERS.length];
    n = Math.floor(n / LETTERS.length) + i * 13;
  }
  return { id: `BK${1000 + s.seq}`, pnr };
}

/** Who made the request: the gateway adds X-AgentGate-* headers for verified agents. */
export function actorFrom(headers: Headers): string {
  const agent = headers.get('x-agentgate-agent');
  return agent ? `${agent} via AgentGate` : 'FlyDemo.com';
}
