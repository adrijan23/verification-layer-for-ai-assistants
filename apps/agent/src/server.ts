import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { currentFrame, getPage, resetBrowser } from './browser';
import { env } from './env';
import { chatHistory, emit, onEvent, say, system } from './events';
import { keywordIntent, parseIntent, type Intent } from './intent';
import * as S from './scenarios';
import { uiHtml } from './ui';

let busy: string | null = null;

async function runIntent(intent: Intent): Promise<string> {
  switch (intent.intent) {
    case 'book_flight':
      return S.bookFlight(intent);
    case 'change_email':
      return S.changeEmail(intent);
    case 'place_order':
      return S.placeOrder(intent);
    case 'change_address':
      return S.changeAddress(intent);
    case 'scrape_prices':
      return S.scrapePrices(intent);
    case 'connect':
      return S.connectPlatform(intent);
    default:
      return 'unknown';
  }
}

async function exclusive(task: string, fn: () => Promise<string>) {
  if (busy) {
    say(`I’m still working on “${busy}”. One thing at a time.`, 'warn');
    return { ok: false, outcome: 'busy' };
  }
  busy = task;
  emit({ type: 'status', busy: true, task });
  try {
    const outcome = await fn();
    return { ok: true, outcome };
  } catch (e) {
    console.error('[agent] task failed', e);
    say(`Something went wrong: ${(e as Error).message.split('\n')[0]}`, 'error');
    return { ok: false, outcome: 'error' };
  } finally {
    busy = null;
    emit({ type: 'status', busy: false, task: null });
  }
}

/** Scripted demo steps (buttons / hotkeys): the presenter never depends on the LLM. */
const SCRIPTED: Record<string, { label: string; prompt: string; intent: Intent }> = {
  flight: { label: 'Book BEG → Paris, economy', prompt: 'Book me a flight to Paris this Friday', intent: { intent: 'book_flight', fareClass: 'economy', payWith: 'card' } },
  business: { label: 'Upgrade to business (€1,400)', prompt: 'Upgrade me to business class', intent: { intent: 'book_flight', fareClass: 'business', payWith: 'card' } },
  miles: { label: 'Pay with 30,000 miles', prompt: 'Use my miles instead', intent: { intent: 'book_flight', fareClass: 'economy', payWith: 'miles' } },
  email: { label: 'Change account email', prompt: 'Change my FlyDemo email to marko.new@protonmail.com', intent: { intent: 'change_email', email: 'marko.new@protonmail.com' } },
  order: { label: 'Order headphones (€89)', prompt: 'Order those noise-cancelling headphones', intent: { intent: 'place_order', productId: 'p-headphones' } },
  address: { label: 'Ship to my office instead', prompt: 'Ship it to my office instead', intent: { intent: 'change_address' } },
  scrape: { label: 'Compare prices ×100', prompt: 'Compare prices on 100 products', intent: { intent: 'scrape_prices', count: 100 } },
};

const app = new Hono();

app.get('/', (c) => c.html(uiHtml(Object.entries(SCRIPTED).map(([id, s]) => ({ id, label: s.label })), env.hasLlm)));
app.get('/api/health', (c) => c.json({ ok: true, busy, llm: env.hasLlm, model: env.model }));

app.get('/api/stream', (c) =>
  streamSSE(c, async (stream) => {
    await stream.writeSSE({ data: JSON.stringify({ type: 'history', items: chatHistory(), busy }) });
    const f = currentFrame();
    if (f) await stream.writeSSE({ data: JSON.stringify({ type: 'frame', ...f }) });
    const queue: string[] = [];
    let wake: (() => void) | null = null;
    const off = onEvent((e) => {
      if (e.type === 'frame') {
        // keep only the newest frame in the queue
        const i = queue.findIndex((q) => q.startsWith('{"type":"frame"'));
        if (i >= 0) queue.splice(i, 1);
      }
      queue.push(JSON.stringify(e));
      wake?.();
    });
    stream.onAbort(() => {
      off();
      wake?.();
    });
    while (!stream.aborted) {
      if (queue.length === 0) {
        await new Promise<void>((r) => {
          wake = r;
          setTimeout(r, 15_000);
        });
        wake = null;
        if (queue.length === 0) await stream.writeSSE({ event: 'ping', data: '' });
        continue;
      }
      await stream.writeSSE({ data: queue.shift()! });
    }
    off();
  }),
);

app.post('/api/chat', async (c) => {
  const { text } = (await c.req.json().catch(() => ({}))) as { text?: string };
  if (!text?.trim()) return c.json({ error: 'empty' }, 400);
  emit({ type: 'chat', role: 'user', text: text.trim(), ts: Date.now() });
  if (busy) {
    say(`I’m still working on “${busy}”. One thing at a time.`, 'warn');
    return c.json({ ok: false, outcome: 'busy' });
  }
  const parsed = await parseIntent(text);
  if (parsed.reply) say(parsed.reply);
  if (parsed.intent.intent === 'unknown') return c.json({ ok: true, outcome: 'unknown', source: parsed.source });
  const result = await exclusive(text.trim().slice(0, 60), () => runIntent(parsed.intent));
  return c.json({ ...result, source: parsed.source, intent: parsed.intent });
});

app.post('/api/run/:step', async (c) => {
  const s = SCRIPTED[c.req.param('step')];
  if (!s) return c.json({ error: 'unknown step' }, 404);
  emit({ type: 'chat', role: 'user', text: s.prompt, ts: Date.now() });
  if (!busy) say(keywordIntent(s.prompt).reply);
  const result = await exclusive(s.label, () => runIntent(s.intent));
  return c.json(result);
});

app.post('/api/reset', async (c) => {
  if (busy) return c.json({ error: 'busy' }, 409);
  await resetBrowser();
  emit({ type: 'reset' });
  system('New agent session: fresh browser, no cookies, unverified on every platform.');
  return c.json({ ok: true });
});

serve({ fetch: app.fetch, port: env.port });
console.log(`[agent] Instinct runner on :${env.port} (headless=${env.headless}, llm=${env.hasLlm ? env.model : 'off, keyword matcher'})`);
getPage().catch((e) => console.error('[agent] browser launch failed', e));
