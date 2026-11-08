// Phases 6–7 (M4 + M5): demo steps 9–12.
// 9 ShopDemo connect + €89 order + shipping-address change denied · 10 price scraping → throttle
// 11 revoke from the dashboard → next request needs approval again · 12 audit chain verified, then tampered.
import { chromium } from 'playwright';
import { URLS, check, failed, post, shooter } from './lib';
import { approveConnect, openPhone } from './user';

async function feed(page: import('playwright').Page) {
  return page.locator('[data-testid=feed-row]').evaluateAll((els) => els.map((e) => `${e.getAttribute('data-action')}:${e.getAttribute('data-decision')}`));
}

async function main() {
  const shot = shooter('phase67');
  await post(`${URLS.console}/api/demo/reset?full=1`);
  await post(`${URLS.agent}/api/reset`);

  const browser = await chromium.launch();
  const { phone } = await openPhone(browser);
  const dash = await (await browser.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
  await dash.goto(`${URLS.console}/dashboard`);
  const agentUi = await (await browser.newContext({ viewport: { width: 1360, height: 820 } })).newPage();
  await agentUi.goto(URLS.agent);

  // Step 9 — second big platform: connect + order headphones (€89 ≤ €150) + address change denied.
  console.log('Step 9: ShopDemo');
  const r9 = post(`${URLS.agent}/api/run/order`);
  await approveConnect(phone, { shot, prefix: 'step9-' });
  check((await r9).json?.outcome === 'ok', 'headphones ordered for €89');
  await agentUi.waitForTimeout(900);
  await shot(agentUi, 'step9-agent-ordered');
  const r9b = await post(`${URLS.agent}/api/run/address`);
  check(r9b.json?.outcome === 'denied', `shipping-address change denied (outcome=${r9b.json?.outcome})`);
  await agentUi.waitForTimeout(900);
  await shot(agentUi, 'step9-agent-address-denied');
  await dash.waitForTimeout(700);
  let f = await feed(dash);
  check(f.includes('order.place:allow'), 'dashboard: order.place €89 → allow');
  check(f.includes('account.change_address:deny'), 'dashboard: account.change_address → deny');

  // Step 10 — price scraping: 100 searches in a few seconds → throttle (20/min on product.search).
  console.log('Step 10: abuse');
  const r10 = await post(`${URLS.agent}/api/run/scrape`);
  check(r10.json?.outcome === 'throttled', `agent got throttled (outcome=${r10.json?.outcome})`);
  await dash.waitForTimeout(1500);
  f = await feed(dash);
  check(f.includes('product.search:throttle'), 'dashboard shows throttle rows');
  const throttled = Number(await dash.getByTestId('kpi-throttled').textContent());
  check(throttled >= 70, `throttled KPI counts the burst (${throttled})`);
  await shot(dash, 'step10-dashboard-throttle');

  // Step 11 — revoke from the dashboard; the agent's next request is stopped.
  console.log('Step 11: revoke');
  await dash.getByTestId('revoke-shopdemo').click();
  await dash.waitForTimeout(800);
  const r11 = await post(`${URLS.agent}/api/run/order`);
  check(r11.json?.outcome === 'revoked', `agent stops after revoke (outcome=${r11.json?.outcome})`);
  await agentUi.waitForTimeout(800);
  await shot(agentUi, 'step11-agent-revoked');
  await dash.waitForTimeout(700);
  f = await feed(dash);
  check(f.includes('grant.revoked:revoked'), 'dashboard: grant revoked');
  check(f.includes('auth.login:connect_required'), 'dashboard: next sign-in → connect required');
  await shot(dash, 'step11-dashboard-revoked');

  // Recovery path: user reconnects from a *different* device (passkey unknown there) → registers a new one.
  console.log('Reconnect from a new device');
  const { phone: phone2 } = await openPhone(browser);
  const rc = post(`${URLS.agent}/api/chat`, { text: 'Connect me to ShopDemo again' });
  const link = phone2.getByTestId('phone-sms-link').last();
  await link.waitFor({ timeout: 30_000 });
  await link.click();
  const frame = phone2.frameLocator('[data-testid=phone-connect-frame]');
  await frame.getByTestId('connect-signin').click();
  await frame.getByTestId('connect-approve').click();
  await frame.getByTestId('connect-register').waitFor({ timeout: 20_000 });
  await shot(phone2, 'reconnect-new-device-offer');
  await frame.getByTestId('connect-register').click();
  await frame.getByTestId('connect-done').waitFor({ timeout: 20_000 });
  check((await rc).json?.outcome === 'ok', 'reconnect with a newly registered passkey works');

  // Step 12 — evidence: chain verified; then simulate an insider editing a row.
  console.log('Step 12: evidence');
  await dash.getByTestId('verify-chain').click();
  await dash.waitForTimeout(800);
  check((await dash.getByTestId('chain-badge').getAttribute('data-ok')) === 'true', 'badge: Chain verified ✓');
  await shot(dash, 'step12-chain-verified', true);
  await dash.getByTestId('tamper').click();
  await dash.waitForTimeout(1200);
  const badge = await dash.getByTestId('chain-badge').textContent();
  check(badge?.startsWith('Chain broken at #'), `badge after tampering: "${badge}"`);
  const v = await fetch(`${URLS.console}/api/audit/verify`).then((r) => r.json());
  check(v.ok === false && typeof v.brokenAtSeq === 'number', `API verify reports broken at #${v.brokenAtSeq}`);
  await shot(dash, 'step12-chain-broken');

  await browser.close();
  if (failed()) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
