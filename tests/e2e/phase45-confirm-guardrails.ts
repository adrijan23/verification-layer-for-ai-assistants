// Phases 4–5 (M2 + M3): demo steps 1, 2, 6, 7, 8.
// 1 legacy bot block (gateway OFF) · 2 presenter turns the gateway ON · 6 over-limit payment → phone → Deny
// 7 miles → phone → Approve with passkey · 8 account email change → platform guardrail deny.
import { chromium } from 'playwright';
import { URLS, check, failed, post, shooter } from './lib';
import { answerApproval, approveConnect, openPhone } from './user';

async function feed(page: import('playwright').Page) {
  return page.locator('[data-testid=feed-row]').evaluateAll((els) => els.map((e) => `${e.getAttribute('data-action')}:${e.getAttribute('data-decision')}`));
}

async function main() {
  const shot = shooter('phase45');
  await post(`${URLS.console}/api/demo/reset?full=1`);
  await post(`${URLS.agent}/api/reset`);

  const browser = await chromium.launch();
  const { phone } = await openPhone(browser);
  const dash = await (await browser.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
  await dash.goto(`${URLS.console}/dashboard`);
  const agentUi = await (await browser.newContext({ viewport: { width: 1360, height: 820 } })).newPage();
  await agentUi.goto(URLS.agent);

  // Step 1 — gateway OFF: the airline's legacy bot rules block the assistant.
  console.log('Step 1: legacy bot block');
  const r1 = await post(`${URLS.agent}/api/run/flight`);
  check(r1.json?.outcome === 'blocked', `agent is blocked by legacy bot rules (outcome=${r1.json?.outcome})`);
  await agentUi.waitForTimeout(700);
  await shot(agentUi, 'step1-agent-legacy-block');
  await dash.waitForTimeout(600);
  check((await feed(dash)).includes('http.request:deny'), 'dashboard shows the legacy block (lost transaction)');
  await shot(dash, 'step1-dashboard-gateway-off');

  // Step 2 — presenter flips "Gateway: ON" for FlyDemo in the dashboard.
  console.log('Step 2: install');
  await dash.getByTestId('gateway-flydemo').check({ force: true });
  await dash.waitForTimeout(900);
  check((await dash.getByTestId('gateway-state-flydemo').textContent())?.includes('ON'), 'dashboard toggle shows Gateway ON');
  await shot(dash, 'step2-gateway-on');

  // Steps 3–5 — connect + €240 economy (allowed).
  console.log('Steps 3–5: connect + allowed purchase');
  const r5 = post(`${URLS.agent}/api/run/flight`);
  await approveConnect(phone, { shot, prefix: 'step4-' });
  check((await r5).json?.outcome === 'ok', 'economy €240 ticket booked');

  // Step 6 — €1,400 business: over the €500 limit → held, phone approval → Deny.
  console.log('Step 6: over-limit → deny on phone');
  const r6 = post(`${URLS.agent}/api/run/business`);
  await answerApproval(phone, false, { shot, name: 'step6-phone-approve-1400' });
  const o6 = await r6;
  check(o6.json?.outcome === 'declined', `agent told the user declined (outcome=${o6.json?.outcome})`);
  await agentUi.waitForTimeout(900);
  await shot(agentUi, 'step6-agent-declined-banner');
  await dash.waitForTimeout(600);
  let f = await feed(dash);
  check(f.includes('flight.book:confirm') && f.includes('flight.book:denied_by_user'), 'dashboard: flight.book confirm → denied by user');

  // Step 7 — 30,000 miles: always ask → Approve with passkey → ticket issued.
  console.log('Step 7: miles → approve with passkey');
  const r7 = post(`${URLS.agent}/api/run/miles`);
  await answerApproval(phone, true, { shot, name: 'step7-phone-miles' });
  const o7 = await r7;
  check(o7.json?.outcome === 'ok', `miles booking went through after approval (outcome=${o7.json?.outcome})`);
  await phone.waitForTimeout(400);
  await shot(phone, 'step7-phone-approved');
  await dash.waitForTimeout(600);
  f = await feed(dash);
  check(f.includes('miles.redeem:confirm') && f.includes('miles.redeem:approved'), 'dashboard: miles.redeem confirm → approved');

  // Step 8 — account email change: platform guardrail, instantly denied.
  console.log('Step 8: email change → guardrail');
  const t0 = Date.now();
  const r8 = await post(`${URLS.agent}/api/run/email`);
  check(r8.json?.outcome === 'denied', `email change denied (outcome=${r8.json?.outcome})`);
  await agentUi.waitForTimeout(800);
  await shot(agentUi, 'step8-agent-email-denied');
  await dash.waitForTimeout(600);
  f = await feed(dash);
  check(f.includes('account.change_email:deny'), 'dashboard: account.change_email → deny (platform guardrail)');
  console.log(`  (email step took ${Date.now() - t0} ms end to end)`);

  const acct = await fetch(`${URLS.fly.replace('4001', '4001')}/account`).then((r) => r.text());
  check(acct.includes('marko@example.com'), 'airline account email is unchanged');
  const blockedKpi = await dash.getByTestId('kpi-blocked').textContent();
  check(Number(blockedKpi) >= 2, `"risky actions blocked" KPI counts denials (${blockedKpi})`);
  await shot(dash, 'step8-dashboard', true);

  // Gateway holds the request: a direct confirm that is never answered expires (unit check of timeout path is in policy tests).
  const verify = await fetch(`${URLS.console}/api/audit/verify`).then((r) => r.json());
  check(verify.ok === true, `audit chain verifies (${verify.count} events)`);

  await browser.close();
  if (failed()) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
