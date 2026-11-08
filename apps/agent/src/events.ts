import { EventEmitter } from 'node:events';

export type UiEvent =
  | { type: 'chat'; role: 'user' | 'agent' | 'system'; text: string; tone?: 'ok' | 'warn' | 'error' | 'wait'; ts: number }
  | { type: 'frame'; data: string; url: string }
  | { type: 'status'; busy: boolean; task: string | null }
  | { type: 'reset' };

const bus = new EventEmitter();
bus.setMaxListeners(0);
const history: UiEvent[] = [];

export function emit(e: UiEvent) {
  if (e.type === 'chat') {
    history.push(e);
    if (history.length > 200) history.shift();
  }
  if (e.type === 'reset') history.length = 0;
  bus.emit('e', e);
}

export function onEvent(fn: (e: UiEvent) => void) {
  bus.on('e', fn);
  return () => bus.off('e', fn);
}

export function chatHistory() {
  return [...history];
}

export function say(text: string, tone?: 'ok' | 'warn' | 'error' | 'wait') {
  emit({ type: 'chat', role: 'agent', text, tone, ts: Date.now() });
}

export function system(text: string) {
  emit({ type: 'chat', role: 'system', text, ts: Date.now() });
}
