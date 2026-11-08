// Phase 3 (M1): demo steps 3–5. Agent hits sign-in → interstitial → relays link → user approves
// on the phone with a passkey → agent buys the €240 economy ticket → dashboard shows the trail.
import { chromium } from 'playwright';
import { URLS, check, failed, post, shooter } from './lib';
import { approveConnect, openPhone } from './user';

async function main() {
  const shot = shooter('phase3');
  await post(`${URLS.console}/api/demo/reset?full=1`);
  await post(`${URLS.agent}/api/reset`);
  await post(`${URLS.console}/api/platforms/flydemo/gateway`, { enabled: true });

  // Unit-level gateway checks
  const human = await fetch(`${URLS.fly}/api/flights`);
  check(human.status === 200, 'human request passes through the gateway untouched');
  const unverified = await fetch(`${URLS.fly}/api/flights`, { headers: { 'user-agent': 'x InstinctDemo/1.0' } });
  const ubody = await unverified.json();
  check(unverified.status === 401 && ubody.error === 'agent_connect_required' && ubody.connectUrl?.includes('/connect?sid=ag_'), 'unverified agent API call → 401 agent_connect_required with connectUrl');
  check((unverified.headers.get('www-authenticate') ?? '').startsWith('AgentConnect url='), 'WWW-Authenticate: AgentConnect header present');
  const decideNoSecret = await post(`${URLS.console}/api/decide`, {});
  check(decideNoSecret.status === 401, 'console /api/decide rejects calls without the gateway secret');

  const browser = await chromium.launch();
  const { phone } = await openPhone(browser);
  const dash = await (await browser.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
  await dash.goto(`${URLS.console}/dashboard`);
  const agentUi = await (await browser.newContext({ viewport: { width: 1360, height: 820 } })).newPage();
  await agentUi.goto(URLS.agent);

  // Agent: step "Book BEG → Paris" (runs until done; user approves meanwhile)
  const run = post(`${URLS.agent}/api/run/flight`);
  await approveConnect(phone, { shot });
  const result = await run;
  check(result.json?.outcome === 'ok', `agent booked the economy ticket (outcome=${result.json?.outcome})`);
  await agentUi.waitForTimeout(800);
  await shot(agentUi, 'agent-booked');

  await dash.waitForTimeout(1200);
  const rows = await dash.locator('[data-testid=feed-row]').evaluateAll((els) => els.map((e) => `${e.getAttribute('data-action')}:${e.getAttribute('data-decision')}`));
  check(rows.includes('auth.login:connect_required'), 'dashboard: auth.login → connect_required');
  check(rows.includes('grant.created:allow'), 'dashboard: grant.created → allow');
  check(rows.includes('flight.book:allow'), 'dashboard: flight.book €240 → allow');
  const revenue = await dash.getByTestId('kpi-revenue').textContent();
  check(revenue?.includes('240'), `revenue KPI shows €240 (${revenue})`);
  await shot(dash, 'dashboard-after-booking');

  // The booking is attributed to the agent on the airline side
  const trips = await (await browser.newContext()).newPage();
  await trips.goto(`${URLS.fly}/trips`);
  check((await trips.getByTestId('trips-list').textContent())?.includes('InstinctDemo via AgentGate'), 'airline sees the trip as booked by InstinctDemo via AgentGate');
  await shot(trips, 'flydemo-trips-agent');

  const verify = await fetch(`${URLS.console}/api/audit/verify`).then((r) => r.json());
  check(verify.ok === true, `audit chain verifies (${verify.count} events)`);

  await browser.close();
  if (failed()) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
