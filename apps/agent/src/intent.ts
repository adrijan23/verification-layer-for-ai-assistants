import Anthropic from '@anthropic-ai/sdk';
import { env } from './env';

export type Intent =
  | { intent: 'book_flight'; fareClass: 'economy' | 'business'; payWith: 'card' | 'miles' }
  | { intent: 'change_email'; email?: string }
  | { intent: 'place_order'; productId: string }
  | { intent: 'change_address'; address?: string }
  | { intent: 'scrape_prices'; count: number }
  | { intent: 'connect'; platform: 'flydemo' | 'shopdemo' }
  | { intent: 'unknown' };

export interface ParsedIntent {
  intent: Intent;
  reply: string;
  source: 'claude' | 'keywords';
}

const INTENTS = ['book_flight', 'change_email', 'place_order', 'change_address', 'scrape_prices', 'connect', 'unknown'];

const SCHEMA = {
  type: 'object',
  properties: {
    intent: { type: 'string', enum: INTENTS },
    fareClass: { type: ['string', 'null'] },
    payWith: { type: ['string', 'null'] },
    email: { type: ['string', 'null'] },
    address: { type: ['string', 'null'] },
    productId: { type: ['string', 'null'] },
    platform: { type: ['string', 'null'] },
    count: { type: ['integer', 'null'] },
    reply: { type: 'string' },
  },
  required: ['intent', 'fareClass', 'payWith', 'email', 'address', 'productId', 'platform', 'count', 'reply'],
  additionalProperties: false,
};

const SYSTEM = `You are the intent parser for "Instinct", a personal AI assistant demo. Map the user's chat message to exactly one intent.

Intents and fields:
- book_flight: book the Belgrade → Paris flight on FlyDemo. fareClass "economy" (default) or "business" (for "upgrade", "business"). payWith "card" (default) or "miles" (for "miles", "points").
- change_email: change the FlyDemo account email. email: the new address if given, else null.
- place_order: buy a product on ShopDemo. productId: "p-headphones" (default; headphones), "p-watch" (smartwatch), "p-laptop" (laptop).
- change_address: change the ShopDemo shipping address (e.g. "ship it to my office"). address: the new address if given, else null.
- scrape_prices: compare or scrape prices with many searches. count: number of searches (default 100).
- connect: connect / re-approve the assistant on a platform. platform "flydemo" or "shopdemo".
- unknown: anything else.

reply: one short, friendly sentence in English saying what you are about to do (or, for unknown, what you can do). Set unused fields to null.`;

const client = env.hasLlm ? new Anthropic() : null;

/** Claude turns the chat message into a plan; deterministic keyword rules are the fallback. */
export async function parseIntent(text: string): Promise<ParsedIntent> {
  if (client) {
    try {
      const res = await client.beta.messages.create(
        {
          model: env.model,
          max_tokens: 1024,
          // Refusal safety net: on a policy decline the API re-runs the request on a fallback model.
          betas: ['server-side-fallback-2026-07-01'],
          fallbacks: 'default',
          output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
          system: SYSTEM,
          messages: [{ role: 'user', content: text }],
        },
        { timeout: 12_000, maxRetries: 1 },
      );
      if (res.stop_reason !== 'refusal') {
        const block = res.content.find((b) => b.type === 'text');
        if (block && block.type === 'text') {
          const raw = JSON.parse(block.text);
          const intent = normalize(raw);
          if (intent) return { intent, reply: String(raw.reply ?? ''), source: 'claude' };
        }
      }
    } catch (e) {
      console.error('[agent] Claude intent parse failed, using keywords:', (e as Error).message);
    }
  }
  return keywordIntent(text);
}

function normalize(raw: any): Intent | null {
  switch (raw?.intent) {
    case 'book_flight':
      return {
        intent: 'book_flight',
        fareClass: raw.fareClass === 'business' ? 'business' : 'economy',
        payWith: raw.payWith === 'miles' ? 'miles' : 'card',
      };
    case 'change_email':
      return { intent: 'change_email', email: typeof raw.email === 'string' && raw.email.includes('@') ? raw.email : undefined };
    case 'place_order':
      return { intent: 'place_order', productId: ['p-headphones', 'p-watch', 'p-laptop'].includes(raw.productId) ? raw.productId : 'p-headphones' };
    case 'change_address':
      return { intent: 'change_address', address: typeof raw.address === 'string' && raw.address.length > 4 ? raw.address : undefined };
    case 'scrape_prices':
      return { intent: 'scrape_prices', count: Number.isInteger(raw.count) && raw.count > 0 ? raw.count : 100 };
    case 'connect':
      return { intent: 'connect', platform: raw.platform === 'flydemo' ? 'flydemo' : 'shopdemo' };
    case 'unknown':
      return { intent: 'unknown' };
    default:
      return null;
  }
}

export function keywordIntent(text: string): ParsedIntent {
  const t = text.toLowerCase();
  const email = text.match(/[^\s@]+@[^\s@]+\.[^\s@]+/)?.[0];
  const pick = (intent: Intent, reply: string): ParsedIntent => ({ intent, reply, source: 'keywords' });
  if (/e-?mail/.test(t)) return pick({ intent: 'change_email', email }, 'I’ll update the email on your FlyDemo account.');
  if (/scrap|compare|prices|100 /.test(t)) return pick({ intent: 'scrape_prices', count: 100 }, 'I’ll compare prices across ShopDemo.');
  if (/address|ship|office|deliver/.test(t)) return pick({ intent: 'change_address' }, 'I’ll change your ShopDemo shipping address.');
  if (/connect|approve|reconnect/.test(t))
    return pick({ intent: 'connect', platform: /fly|airline/.test(t) ? 'flydemo' : 'shopdemo' }, 'I’ll ask you to approve me again.');
  if (/mile|points/.test(t)) return pick({ intent: 'book_flight', fareClass: 'economy', payWith: 'miles' }, 'I’ll book the Paris flight with your miles.');
  if (/business|upgrade/.test(t)) return pick({ intent: 'book_flight', fareClass: 'business', payWith: 'card' }, 'I’ll book business class to Paris.');
  if (/flight|fly|paris|ticket|book/.test(t)) return pick({ intent: 'book_flight', fareClass: 'economy', payWith: 'card' }, 'I’ll book you a flight to Paris this Friday.');
  if (/watch/.test(t)) return pick({ intent: 'place_order', productId: 'p-watch' }, 'I’ll order the smartwatch.');
  if (/laptop/.test(t)) return pick({ intent: 'place_order', productId: 'p-laptop' }, 'I’ll order the laptop.');
  if (/headphone|order|buy|shop/.test(t)) return pick({ intent: 'place_order', productId: 'p-headphones' }, 'I’ll order the noise-cancelling headphones.');
  return pick({ intent: 'unknown' }, 'I can book flights on FlyDemo and shop on ShopDemo. Try “Book me a flight to Paris this Friday”.');
}
