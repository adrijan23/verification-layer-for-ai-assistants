// Phase 2: a human customer uses both demo platforms through the gateway (not affected by AgentGate).
import { chromium } from 'playwright';
import { URLS, check, failed, post, shooter } from './lib';

async function main() {
  await post(`${URLS.console}/api/demo/reset`).catch(() => null);
  await post('http://localhost:5001/api/demo/reset');
  await post('http://localhost:5002/api/demo/reset');

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1360, height: 860 } });
  const page = await ctx.newPage();
  const shot = shooter('phase2');

  console.log('FlyDemo (human):');
  await page.goto(URLS.fly + '/');
  await shot(page, 'flydemo-home');
  await page.getByTestId('search-submit').click();
  await page.getByTestId('flight-results').waitFor();
  await shot(page, 'flydemo-results');
  await page.getByTestId('fare-FD101-economy').click();
  await page.getByTestId('pay-button').waitFor();
  await shot(page, 'flydemo-checkout');
  await page.getByTestId('pay-button').click();
  await page.getByTestId('booking-confirmation').waitFor();
  check(/[A-Z]{6}/.test((await page.getByTestId('booking-pnr').textContent()) ?? ''), 'economy ticket booked with a PNR');
  await shot(page, 'flydemo-confirmation');
  await page.goto(URLS.fly + '/trips');
  check((await page.getByTestId('trips-list').textContent())?.includes('FlyDemo.com'), 'trip shows it was booked on FlyDemo.com');
  await shot(page, 'flydemo-trips');
  await page.goto(URLS.fly + '/account');
  await page.getByTestId('new-email').fill('marko.new@example.com');
  await page.getByTestId('save-email').click();
  await page.getByTestId('email-result').waitFor();
  check((await page.getByTestId('email-result').textContent())?.includes('updated'), 'human can change email (no gateway interference)');
  await shot(page, 'flydemo-account');

  console.log('ShopDemo (human):');
  await page.goto(URLS.shop + '/');
  await shot(page, 'shopdemo-home');
  await page.getByTestId('search-input').fill('headphones');
  await page.getByTestId('search-submit').click();
  await page.getByTestId('search-results').waitFor();
  await shot(page, 'shopdemo-search');
  await page.goto(URLS.shop + '/products/p-headphones');
  await shot(page, 'shopdemo-product');
  await page.getByTestId('buy-now').click();
  await page.waitForURL('**/checkout');
  await page.getByTestId('place-order').waitFor();
  await shot(page, 'shopdemo-checkout');
  await page.getByTestId('place-order').click();
  await page.getByTestId('order-confirmation').waitFor();
  check(((await page.getByTestId('order-id').textContent()) ?? '').startsWith('114-'), 'order placed');
  await shot(page, 'shopdemo-confirmation');
  await page.goto(URLS.shop + '/orders');
  await shot(page, 'shopdemo-orders');
  await page.goto(URLS.shop + '/account');
  await page.getByTestId('new-address').fill('Bulevar Mihajla Pupina 10, Novi Beograd');
  await page.getByTestId('save-address').click();
  await page.getByTestId('address-result').waitFor();
  check((await page.getByTestId('address-result').textContent())?.includes('updated'), 'human can change address');

  // Server-side price validation (agent cannot lie about the price)
  const lie = await post(URLS.fly + '/api/bookings', { flightId: 'FD101', fareClass: 'business', total: 240, currency: 'EUR', payWith: 'card' });
  check(lie.status === 400, `upstream rejects a mismatched price (status ${lie.status})`);

  await browser.close();
  if (failed()) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
