import type { Page } from 'playwright';
import { agentSid, getPage } from './browser';
import { DEMO_USER_EMAIL, PLATFORMS, env, type PlatformKey } from './env';
import { say } from './events';

// ---------------------------------------------------------------------------------------------
// Deterministic, scripted browser steps. The LLM only picks which scenario to run; the steps
// themselves never depend on it (reliability over autonomy).
// ---------------------------------------------------------------------------------------------

type Outcome = 'ok' | 'blocked' | 'denied' | 'declined' | 'throttled' | 'revoked' | 'timeout' | 'error';

interface ApiResult {
  status: number;
  body: any;
}

function thisFriday(now = new Date()): string {
  const d = new Date(now);
  d.setDate(d.getDate() + ((5 - d.getDay() + 7) % 7));
  return d.toISOString().slice(0, 10);
}

async function consoleGet(path: string) {
  try {
    const r = await fetch(`${env.consoleUrl}${path}`);
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  }
}

async function sessionStatus(sid: string | undefined): Promise<{ status: string; pendingConfirmation: { id: string } | null } | null> {
  return sid ? consoleGet(`/api/sessions/${sid}`) : null;
}

/** Run a UI action and wait for the matching API response (narrates while a request is held for approval). */
async function awaitApi(
  page: Page,
  method: string,
  pathPrefix: string,
  trigger: () => Promise<unknown>,
  opts: { timeout?: number; sid?: string; waitText?: string } = {},
): Promise<ApiResult> {
  const respP = page.waitForResponse(
    (r) => r.request().method() === method && new URL(r.url()).pathname.startsWith(pathPrefix),
    { timeout: opts.timeout ?? 20_000 },
  );
  await trigger();
  let narrated = false;
  const poll = setInterval(async () => {
    if (narrated || !opts.sid) return;
    const s = await sessionStatus(opts.sid);
    if (s?.pendingConfirmation) {
      narrated = true;
      say(opts.waitText ?? 'This needs your OK. I sent an approval request to your phone and I’m waiting…', 'wait');
    }
  }, 600);
  try {
    const r = await respP;
    return { status: r.status(), body: await r.json().catch(() => null) };
  } finally {
    clearInterval(poll);
  }
}

/** Turn a gateway / platform error into narration. */
function explain(platform: string, r: ApiResult): Outcome {
  const err = r.body?.error as string | undefined;
  const msg = r.body?.message as string | undefined;
  switch (err) {
    case 'agent_action_denied':
      say(`${platform} blocked this: ${msg}`, 'error');
      return 'denied';
    case 'agent_action_denied_by_user':
      say(r.body?.reason === 'confirmation_timeout' ? 'You didn’t answer on your phone in time, so I stopped.' : 'You declined this on your phone, so I didn’t go ahead.', 'warn');
      return 'declined';
    case 'agent_rate_limited':
      say(`${platform} is rate-limiting me. Retry in ${r.body?.retryAfterSec ?? 'a few'}s.`, 'warn');
      return 'throttled';
    case 'agent_connect_required':
      say(`${platform} needs your approval again before I can continue.`, 'warn');
      return 'revoked';
    case 'access_denied':
      say(`${platform} blocked me as automated traffic.`, 'error');
      return 'blocked';
    default:
      say(`${platform} returned an error (${r.status})${msg ? `: ${msg}` : ''}.`, 'error');
      return 'error';
  }
}

async function relayLink(key: PlatformKey, connectUrl: string) {
  const p = PLATFORMS[key];
  await fetch(`${env.consoleUrl}/api/phone/messages`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      sender: 'Instinct',
      platformId: key,
      platformUserEmail: DEMO_USER_EMAIL,
      title: `Approve me on ${p.name}?`,
      body: `Your assistant wants to make transactions on ${p.name} for you. Tap to choose what I may do:`,
      link: connectUrl,
    }),
  });
}

async function waitAuthorized(sid: string, timeoutMs = 180_000): Promise<boolean> {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    const s = await sessionStatus(sid);
    if (s?.status === 'authorized') return true;
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

/**
 * Sign in to a platform. Agents never get a password: the gateway answers the login page with the
 * AgentGate interstitial, the agent relays the one-time link to its user, and waits for approval.
 */
export async function ensureConnected(key: PlatformKey, opts: { force?: boolean } = {}): Promise<Outcome> {
  const p = PLATFORMS[key];
  const page = await getPage();
  say(`Signing in to ${p.name}…`);
  const resp = await page.goto(`${p.base}/login`, { waitUntil: 'domcontentloaded' });
  const status = resp?.status() ?? 0;

  if (status === 403) {
    say(`${p.name} blocked me: “Access Denied — automated traffic detected.” I can’t complete this for you there.`, 'error');
    return 'blocked';
  }
  if (page.url().includes('agentgate=signed-in')) {
    say(`Signed in to ${p.name} as you, through AgentGate. No password shared.`, 'ok');
    return 'ok';
  }
  if (status !== 401) {
    say(`Unexpected response from ${p.name} (${status}).`, 'error');
    return 'error';
  }

  const connectUrl = await page.locator('meta[name="agentgate-connect-url"]').getAttribute('content');
  const sid = await agentSid(key, p.base);
  if (!connectUrl || !sid) {
    say(`${p.name} asked for approval, but I couldn’t read the link.`, 'error');
    return 'error';
  }
  const s = await sessionStatus(sid);
  if (s?.status === 'revoked' && !opts.force) {
    say(`You revoked my access to ${p.name}. I won’t continue unless you connect me again.`, 'error');
    return 'revoked';
  }

  say(`${p.name} lets assistants in only with your permission. I sent you a link. Please approve me on your phone.`, 'wait');
  await relayLink(key, connectUrl);
  if (!(await waitAuthorized(sid))) {
    say('No approval yet, so I stopped here.', 'warn');
    return 'timeout';
  }
  say('Thanks, you approved me. Continuing…', 'ok');
  await page.goto(`${p.base}/login`, { waitUntil: 'domcontentloaded' });
  if (page.url().includes('agentgate=signed-in')) {
    say(`Signed in to ${p.name} as you, through AgentGate.`, 'ok');
    return 'ok';
  }
  say(`Still not signed in to ${p.name}.`, 'error');
  return 'error';
}

// ----------------------------------- FlyDemo -----------------------------------

export async function bookFlight(args: { fareClass?: 'economy' | 'business'; payWith?: 'card' | 'miles' }): Promise<Outcome> {
  const fareClass = args.fareClass ?? 'economy';
  const payWith = fareClass === 'business' ? 'card' : (args.payWith ?? 'card');
  const p = PLATFORMS.flydemo;
  const conn = await ensureConnected('flydemo');
  if (conn !== 'ok') return conn;
  const page = await getPage();

  say('Searching flights Belgrade → Paris for Friday…');
  const search = await awaitApi(page, 'GET', '/api/flights', () =>
    page.goto(`${p.base}/flights?from=BEG&to=CDG&date=${thisFriday()}`, { waitUntil: 'domcontentloaded' }),
  );
  if (search.status !== 200) return explain(p.name, search);
  await page.getByTestId('flight-results').waitFor();

  const price = fareClass === 'business' ? 1400 : 240;
  say(`Found FD101, nonstop at 07:35. Selecting ${fareClass === 'business' ? 'business class (FlyDemo One)' : 'economy (Main Cabin)'}.`);
  await page.getByTestId(`fare-FD101-${fareClass}`).click();
  await page.getByTestId('pay-button').waitFor();
  if (payWith === 'miles') await page.getByTestId('pay-with-miles').check();
  await page.waitForTimeout(400);

  say(payWith === 'miles' ? 'Paying with 30,000 of your miles…' : `Paying €${price.toLocaleString('en-US')} with your Visa •••• 4242…`);
  const sid = await agentSid('flydemo', p.base);
  const r = await awaitApi(page, 'POST', '/api/bookings', () => page.getByTestId('pay-button').click(), { timeout: 120_000, sid });
  if (r.status !== 200) return explain(p.name, r);
  await page.getByTestId('booking-confirmation').waitFor();
  say(`Booked! Belgrade → Paris on Friday, confirmation ${r.body.pnr}.`, 'ok');
  return 'ok';
}

export async function changeEmail(args: { email?: string }): Promise<Outcome> {
  const email = args.email || 'marko.new@protonmail.com';
  const p = PLATFORMS.flydemo;
  const conn = await ensureConnected('flydemo');
  if (conn !== 'ok') return conn;
  const page = await getPage();
  await page.goto(`${p.base}/account`, { waitUntil: 'domcontentloaded' });
  say(`Changing your FlyDemo sign-in email to ${email}…`);
  await page.getByTestId('new-email').fill(email);
  const r = await awaitApi(page, 'POST', '/api/account/email', () => page.getByTestId('save-email').click());
  if (r.status !== 200) return explain(p.name, r);
  say(`Email changed to ${email}.`, 'ok');
  return 'ok';
}

// ----------------------------------- ShopDemo -----------------------------------

const PRODUCTS: Record<string, { title: string; price: number }> = {
  'p-headphones': { title: 'noise-cancelling headphones', price: 89 },
  'p-watch': { title: 'smartwatch', price: 249 },
  'p-laptop': { title: 'Laptop Pro 14', price: 1299 },
};

export async function placeOrder(args: { productId?: string }): Promise<Outcome> {
  const productId = args.productId && PRODUCTS[args.productId] ? args.productId : 'p-headphones';
  const product = PRODUCTS[productId];
  const p = PLATFORMS.shopdemo;
  const conn = await ensureConnected('shopdemo');
  if (conn !== 'ok') return conn;
  const page = await getPage();

  say(`Opening the ${product.title} on ShopDemo…`);
  await page.goto(`${p.base}/products/${productId}`, { waitUntil: 'domcontentloaded' });
  await page.getByTestId('buy-now').waitFor();
  const cart = await awaitApi(page, 'POST', '/api/cart', () => page.getByTestId('buy-now').click());
  if (cart.status !== 200) return explain(p.name, cart);
  await page.waitForURL('**/checkout');
  await page.getByTestId('place-order').waitFor();
  say(`Placing the order: €${product.price.toLocaleString('en-US')}, shipping to Knez Mihailova 1…`);
  const sid = await agentSid('shopdemo', p.base);
  const r = await awaitApi(page, 'POST', '/api/orders', () => page.getByTestId('place-order').click(), { timeout: 120_000, sid });
  if (r.status !== 200) return explain(p.name, r);
  await page.getByTestId('order-confirmation').waitFor();
  say(`Ordered! Order #${r.body.orderId}, arriving tomorrow.`, 'ok');
  return 'ok';
}

export async function changeAddress(args: { address?: string }): Promise<Outcome> {
  const address = args.address || 'Bulevar Mihajla Pupina 10, Novi Beograd (office)';
  const p = PLATFORMS.shopdemo;
  const conn = await ensureConnected('shopdemo');
  if (conn !== 'ok') return conn;
  const page = await getPage();
  await page.goto(`${p.base}/account`, { waitUntil: 'domcontentloaded' });
  say(`Changing your shipping address to ${address}…`);
  await page.getByTestId('new-address').fill(address);
  const r = await awaitApi(page, 'POST', '/api/account/address', () => page.getByTestId('save-address').click());
  if (r.status !== 200) return explain(p.name, r);
  say('Shipping address updated.', 'ok');
  return 'ok';
}

export async function scrapePrices(args: { count?: number }): Promise<Outcome> {
  const count = Math.min(Math.max(args.count ?? 100, 1), 300);
  const p = PLATFORMS.shopdemo;
  const conn = await ensureConnected('shopdemo');
  if (conn !== 'ok') return conn;
  const page = await getPage();
  await page.goto(`${p.base}/?q=headphones`, { waitUntil: 'domcontentloaded' });
  say(`Comparing prices: firing ${count} product searches in parallel…`);
  const statuses = await page.evaluate(async (n) => {
    const terms = ['headphones', 'watch', 'laptop', 'charger', 'earbuds', 'keyboard'];
    return Promise.all(
      Array.from({ length: n }, (_, i) =>
        fetch(`/api/products?q=${terms[i % terms.length]}&page=${i}`)
          .then((r) => r.status)
          .catch(() => 0),
      ),
    );
  }, count);
  const ok = statuses.filter((s) => s === 200).length;
  const limited = statuses.filter((s) => s === 429).length;
  say(
    limited > 0
      ? `${ok} searches went through, then ShopDemo throttled me: ${limited} requests got “429 Too Many Requests”.`
      : `All ${ok} searches went through.`,
    limited > 0 ? 'warn' : 'ok',
  );
  return limited > 0 ? 'throttled' : 'ok';
}

export async function connectPlatform(args: { platform?: PlatformKey }): Promise<Outcome> {
  return ensureConnected(args.platform ?? 'shopdemo', { force: true });
}
