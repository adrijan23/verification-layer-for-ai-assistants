import { EventEmitter } from 'node:events';
import type { AuditEventDTO } from './audit';
import type { PhoneMessageDTO } from './phone';

export type BusEvent =
  | { type: 'audit'; event: AuditEventDTO }
  | { type: 'phone'; message: PhoneMessageDTO }
  | { type: 'phone_update'; message: PhoneMessageDTO }
  | { type: 'confirmation'; id: string; status: string }
  | { type: 'state'; reason: string };

type G = typeof globalThis & { __agBus?: EventEmitter };

/** Process-wide event bus (globalThis so every Next route bundle shares one instance). */
function emitter(): EventEmitter {
  const g = globalThis as G;
  if (!g.__agBus) {
    g.__agBus = new EventEmitter();
    g.__agBus.setMaxListeners(0);
  }
  return g.__agBus;
}

export function publish(e: BusEvent) {
  emitter().emit('event', e);
}

export function subscribe(fn: (e: BusEvent) => void): () => void {
  emitter().on('event', fn);
  return () => emitter().off('event', fn);
}
