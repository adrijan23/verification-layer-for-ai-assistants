import type { Browser, BrowserContext, Page } from 'playwright';
import { URLS } from './lib';

/** The human user: their phone (console /phone) with a virtual passkey authenticator (stands in for Touch ID). */
export async function openPhone(browser: Browser): Promise<{ ctx: BrowserContext; phone: Page }> {
  const ctx = await browser.newContext({ viewport: { width: 520, height: 900 } });
  const phone = await ctx.newPage();
  const cdp = await ctx.newCDPSession(phone);
  await cdp.send('WebAuthn.enable');
  await cdp.send('WebAuthn.addVirtualAuthenticator', {
    options: {
      protocol: 'ctap2',
      transport: 'internal',
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true,
    },
  });
  await phone.goto(`${URLS.console}/phone`);
  await phone.getByTestId('phone').waitFor();
  return { ctx, phone };
}

/** Wait for the assistant's SMS with the connect link, open it in the phone and approve with the passkey. */
export async function approveConnect(phone: Page, opts: { shot?: (p: Page, name: string) => Promise<unknown>; prefix?: string; limit?: number } = {}) {
  const link = phone.getByTestId('phone-sms-link').last();
  await link.waitFor({ timeout: 30_000 });
  await phone.waitForTimeout(600);
  await opts.shot?.(phone, `${opts.prefix ?? ''}phone-sms`);
  await link.click();
  const frame = phone.frameLocator('[data-testid=phone-connect-frame]');
  await frame.getByTestId('connect-signin').click();
  await frame.getByTestId('permission-list').waitFor();
  if (opts.limit !== undefined) {
    const input = frame.locator('[data-testid^=limit-]').first();
    await input.fill(String(opts.limit));
  }
  await phone.waitForTimeout(300);
  await opts.shot?.(phone, `${opts.prefix ?? ''}phone-consent`);
  await frame.getByTestId('connect-approve').click();
  await frame.getByTestId('connect-done').waitFor({ timeout: 20_000 });
  await opts.shot?.(phone, `${opts.prefix ?? ''}phone-connected`);
}

/** Answer the newest approval card on the phone. */
export async function answerApproval(phone: Page, approve: boolean, opts: { shot?: (p: Page, name: string) => Promise<unknown>; name?: string } = {}) {
  const card = phone.locator('[data-testid=phone-approval][data-status=pending]').last();
  await card.waitFor({ timeout: 30_000 });
  await phone.waitForTimeout(500);
  await opts.shot?.(phone, opts.name ?? 'phone-approval');
  await card.getByTestId(approve ? 'phone-approve' : 'phone-deny').click();
  await phone.locator('[data-testid=phone-approval-status]').last().waitFor({ timeout: 20_000 });
}
