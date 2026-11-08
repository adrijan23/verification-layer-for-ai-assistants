// Phase 8: the complete 12-step stage script on /stage (assistant · phone · console), recorded as a
// backup video. Everything is driven through the real UIs: agent buttons, the phone, the dashboard.
import fs from 'node:fs';
import path from 'node:path';
import { chromium, type FrameLocator, type Page } from 'playwright';
import { OUT, URLS, check, failed, post, shooter } from './lib';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function agentBusy(): Promise<boolean> {
  const h = await fetch(`${URLS.agent}/api/health`).then((r) => r.json());
  return Boolean(h.busy);
}

async function waitIdle(timeoutMs = 150_000) {
  const start = Date.now();
  let sawBusy = false;
  while (Date.now() - start < timeoutMs) {
    const busy = await agentBusy();
    if (busy) sawBusy = true;
    else if (sawBusy || Date.now() - start > 4000) return;
    await sleep(250);
  }
  throw new Error('agent did not finish in time');
}

async function lastAgentLine(): Promise<string> {
  // read the last agent bubble from the chat history stream snapshot
  const res = await fetch(`${URLS.agent}/api/stream`);
  const reader = res.body!.getReader();
  const { value } = await reader.read();
  await reader.cancel();
  const first = new TextDecoder().decode(value).split('\n').find((l) => l.startsWith('data: '));
  const items = JSON.parse(first!.slice(6)).items as { role: string; text: string }[];
  return [...items].reverse().find((i) => i.role === 'agent')?.text ?? '';
}

async function connectOnPhone(phone: FrameLocator) {
  const link = phone.getByTestId('phone-sms-link').last();
  await link.waitFor({ timeout: 30_000 });
  await sleep(1500);
  await link.click();
  const connect = phone.frameLocator('[data-testid=phone-connect-frame]');
  await sleep(1200);
  await connect.getByTestId('connect-signin').click();
  await connect.getByTestId('permission-list').waitFor();
  await sleep(2200);
  await connect.getByTestId('connect-approve').click();
  await connect.getByTestId('connect-done').waitFor({ timeout: 20_000 });
}

async function answer(phone: FrameLocator, approve: boolean) {
  const card = phone.locator('[data-testid=phone-approval][data-status=pending]').last();
  await card.waitFor({ timeout: 30_000 });
  await sleep(2200);
  await card.getByTestId(approve ? 'phone-approve' : 'phone-deny').click();
}

async function main() {
  const shot = shooter('final');
  const videoDir = path.join(OUT, 'final', 'video');
  fs.rmSync(videoDir, { recursive: true, force: true });
  await post(`${URLS.console}/api/demo/reset?full=1`);
  await post(`${URLS.agent}/api/reset`);

  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: videoDir, size: { width: 1920, height: 1080 } },
  });
  const stage: Page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(stage);
  await cdp.send('WebAuthn.enable');
  await cdp.send('WebAuthn.addVirtualAuthenticator', {
    options: { protocol: 'ctap2', transport: 'internal', hasResidentKey: true, hasUserVerification: true, isUserVerified: true, automaticPresenceSimulation: true },
  });
  await stage.goto(`${URLS.console}/stage`);
  const agent = stage.frameLocator('iframe[title=Assistant]');
  const phone = stage.frameLocator('iframe[title=Phone]');
  const dash = stage.frameLocator('iframe[title=Dashboard]');
  await agent.getByTestId('agent-chat').waitFor();
  await phone.getByTestId('phone').waitFor();
  await dash.getByTestId('dashboard').waitFor();
  await sleep(2500);
  await shot(stage, 'stage-ready');

  // 1 — Problem: gateway OFF, legacy bot block.
  await agent.getByTestId('step-flight').click();
  await waitIdle();
  check((await lastAgentLine()).includes('blocked'), 'step 1: legacy bot block');
  await sleep(1500);
  await shot(stage, 'step01-legacy-block');

  // 2 — Install: presenter flips the gateway ON.
  await dash.getByTestId('gateway-flydemo').check({ force: true });
  await sleep(1500);
  check((await dash.getByTestId('gateway-state-flydemo').textContent())?.includes('ON'), 'step 2: gateway ON');
  await shot(stage, 'step02-gateway-on');

  // 3–5 — Connect, grant with passkey, allowed €240 purchase.
  await agent.getByTestId('step-flight').click();
  await phone.getByTestId('phone-sms-link').last().waitFor({ timeout: 30_000 });
  await sleep(1200);
  await shot(stage, 'step03-link-on-phone');
  await connectOnPhone(phone);
  await shot(stage, 'step04-connected');
  await waitIdle();
  check((await lastAgentLine()).startsWith('Booked!'), 'step 5: €240 economy booked');
  await sleep(1500);
  await shot(stage, 'step05-booked');

  // 6 — Over-limit €1,400 → phone → Deny.
  await agent.getByTestId('step-business').click();
  await phone.locator('[data-testid=phone-approval][data-status=pending]').last().waitFor({ timeout: 30_000 });
  await sleep(1000);
  await shot(stage, 'step06-approval-1400');
  await answer(phone, false);
  await waitIdle();
  check((await lastAgentLine()).includes('declined'), 'step 6: denied on phone');
  await sleep(1500);
  await shot(stage, 'step06-denied');

  // 7 — Miles → phone → Approve with passkey.
  await agent.getByTestId('step-miles').click();
  await answer(phone, true);
  await waitIdle();
  check((await lastAgentLine()).startsWith('Booked!'), 'step 7: miles approved and booked');
  await sleep(1500);
  await shot(stage, 'step07-miles-approved');

  // 8 — Account email change → platform guardrail.
  await agent.getByTestId('step-email').click();
  await waitIdle();
  check((await lastAgentLine()).includes('agents cannot change the account email'), 'step 8: email change denied');
  await sleep(1500);
  await shot(stage, 'step08-email-denied');

  // 9 — ShopDemo: connect, €89 order, address change denied.
  await agent.getByTestId('step-order').click();
  await connectOnPhone(phone);
  await waitIdle();
  check((await lastAgentLine()).startsWith('Ordered!'), 'step 9: headphones ordered');
  await sleep(1200);
  await shot(stage, 'step09-ordered');
  await agent.getByTestId('step-address').click();
  await waitIdle();
  check((await lastAgentLine()).includes('shipping address'), 'step 9: address change denied');
  await sleep(1500);
  await shot(stage, 'step09-address-denied');

  // 10 — Abuse: price scraping → throttle.
  await agent.getByTestId('step-scrape').click();
  await waitIdle();
  check((await lastAgentLine()).includes('429'), 'step 10: throttled');
  await sleep(2000);
  await shot(stage, 'step10-throttled');

  // 11 — Revoke from the phone; the agent's next request is stopped.
  await phone.getByTestId('phone-tab-assistants').click();
  await sleep(1200);
  await phone.getByTestId('phone-revoke-shopdemo').click();
  await sleep(1500);
  await shot(stage, 'step11-revoked-on-phone');
  await phone.getByTestId('phone-tab-messages').click();
  await agent.getByTestId('step-order').click();
  await waitIdle();
  check((await lastAgentLine()).includes('revoked'), 'step 11: agent stops after revoke');
  await sleep(1500);
  await shot(stage, 'step11-agent-stopped');

  // 12 — Evidence: verify the chain.
  await dash.getByTestId('verify-chain').click();
  await sleep(1500);
  check((await dash.getByTestId('chain-badge').getAttribute('data-ok')) === 'true', 'step 12: chain verified ✓');
  await shot(stage, 'step12-chain-verified');
  await sleep(2500);

  const video = stage.video();
  await ctx.close();
  if (video) {
    const target = path.join(OUT, 'final', 'agentgate-demo.webm');
    fs.renameSync(await video.path(), target);
    console.log(`  🎬 ${path.relative(OUT, target)}`);
  }

  // Also capture the full (non-compact) dashboard at the end of the run.
  const solo = await (await browser.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
  await solo.goto(`${URLS.console}/dashboard`);
  await sleep(1200);
  await shot(solo, 'dashboard-full', true);
  await browser.close();
  if (failed()) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
