import { chromium, type Browser, type BrowserContext, type CDPSession, type Page } from 'playwright';
import { env } from './env';
import { emit } from './events';

let browser: Browser | null = null;
let context: BrowserContext | null = null;
let page: Page | null = null;
let cdp: CDPSession | null = null;
let lastFrameAt = 0;
let lastFrame: { data: string; url: string } | null = null;

const USER_AGENT = `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36 ${env.agentTag}`;

async function startScreencast(p: Page) {
  try {
    cdp = await p.context().newCDPSession(p);
    let pending: ReturnType<typeof setTimeout> | null = null;
    const flush = () => {
      pending = null;
      lastFrameAt = Date.now();
      if (lastFrame) emit({ type: 'frame', ...lastFrame });
    };
    cdp.on('Page.screencastFrame', (f: { data: string; sessionId: number }) => {
      cdp?.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => null);
      lastFrame = { data: f.data, url: p.url() };
      // ~9 fps with a trailing flush, so the final frame of an animation is never dropped
      const wait = 110 - (Date.now() - lastFrameAt);
      if (wait <= 0 && !pending) flush();
      else if (!pending) pending = setTimeout(flush, Math.max(wait, 0));
    });
    await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 70, maxWidth: 1280, maxHeight: 800, everyNthFrame: 1 });
  } catch (e) {
    console.error('[agent] screencast failed', e);
  }
}

/** The agent's browser: a real Chromium whose User-Agent carries the agent tag. */
export async function getPage(): Promise<Page> {
  if (!browser) browser = await chromium.launch({ headless: env.headless, args: ['--disable-dev-shm-usage'] });
  if (!context) {
    context = await browser.newContext({ userAgent: USER_AGENT, viewport: { width: 1280, height: 800 }, locale: 'en-GB' });
    context.setDefaultTimeout(15_000);
  }
  if (!page || page.isClosed()) {
    page = await context.newPage();
    await startScreencast(page);
    await page.setContent(blankPage());
  }
  return page;
}

/** New browser context = new cookies = a brand-new, unverified agent session on every platform. */
export async function resetBrowser() {
  await cdp?.detach().catch(() => null);
  await context?.close().catch(() => null);
  context = null;
  page = null;
  cdp = null;
  lastFrame = null;
  await getPage();
}

export async function agentSid(platformId: string, base: string): Promise<string | undefined> {
  if (!context) return undefined;
  const cookies = await context.cookies(base);
  return cookies.find((c) => c.name === `ag_sid_${platformId}`)?.value;
}

export function currentFrame() {
  return lastFrame;
}

function blankPage() {
  return `<html><body style="margin:0;display:grid;place-items:center;height:100vh;background:#f4f4f5;font-family:system-ui;color:#71717a">
  <div style="text-align:center"><div style="font-size:42px">✦</div><p>Instinct browser · idle</p></div></body></html>`;
}
