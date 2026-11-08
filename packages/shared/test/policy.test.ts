import { describe, expect, it } from 'vitest';
import { decide, type DecideInput } from '../src/policy';
import { UNMAPPED_ACTION, type Guardrail, type Permission } from '../src/types';

const grant: Permission[] = [
  { action: 'flight.search', mode: 'allow' },
  { action: 'flight.book', mode: 'allow', limit: { amount: 500, currency: 'EUR' }, overLimit: 'confirm' },
  { action: 'order.place', mode: 'allow', limit: { amount: 150, currency: 'EUR' } }, // overLimit defaults to deny
  { action: 'miles.redeem', mode: 'confirm' },
  { action: 'miles.capped', mode: 'allow', limit: { points: 40000 }, overLimit: 'confirm' },
  { action: 'account.change_email', mode: 'deny' },
  { action: 'booking.cancel', mode: 'allow', limit: { amount: 100 } },
];
const guardrails: Guardrail[] = [
  { action: 'account.change_address', mode: 'deny', reason: 'Platform policy: no address changes' },
  { action: 'booking.cancel', mode: 'confirm', reason: 'Platform policy: refunds need confirmation' },
];

function run(over: Partial<DecideInput>) {
  return decide({
    session: { status: 'authorized' },
    action: 'flight.search',
    params: {},
    grant,
    guardrails,
    rateLimited: false,
    ...over,
  });
}

describe('policy engine: session', () => {
  it('unverified session → connect_required', () => {
    const d = run({ session: { status: 'unverified' } });
    expect(d.result).toBe('connect_required');
    expect(d.reason).toBe('not_connected');
  });
  it('pending session → connect_required (approval_pending)', () => {
    expect(run({ session: { status: 'pending' } })).toMatchObject({ result: 'connect_required', reason: 'approval_pending' });
  });
  it('revoked session → connect_required (grant_revoked)', () => {
    expect(run({ session: { status: 'revoked' } })).toMatchObject({ result: 'connect_required', reason: 'grant_revoked' });
  });
  it('session check wins over rate limit and guardrails', () => {
    const d = run({ session: { status: 'unverified' }, rateLimited: true, action: 'account.change_address' });
    expect(d.result).toBe('connect_required');
  });
});

describe('policy engine: rate limit and unmapped', () => {
  it('rate limited → throttle (before guardrails)', () => {
    expect(run({ rateLimited: true, action: 'account.change_address' })).toMatchObject({ result: 'throttle', reason: 'rate_limited' });
  });
  it('unmapped API call → deny unmapped_action', () => {
    expect(run({ action: UNMAPPED_ACTION })).toMatchObject({ result: 'deny', reason: 'unmapped_action' });
  });
});

describe('policy engine: platform guardrails override the grant', () => {
  it('guardrail deny → deny platform_guardrail with the platform reason', () => {
    const d = run({ action: 'account.change_address' });
    expect(d).toMatchObject({ result: 'deny', reason: 'platform_guardrail' });
    expect(d.message).toContain('no address changes');
  });
  it('guardrail confirm beats a user allow', () => {
    expect(run({ action: 'booking.cancel', params: { amount: 10 } })).toMatchObject({ result: 'confirm', reason: 'platform_guardrail' });
  });
  it('wildcard guardrail applies to any action', () => {
    const d = run({ action: 'flight.search', guardrails: [{ action: '*', mode: 'deny' }] });
    expect(d).toMatchObject({ result: 'deny', reason: 'platform_guardrail' });
  });
});

describe('policy engine: grant', () => {
  it('no permission → deny not_granted', () => {
    expect(run({ action: 'gift_card.buy' })).toMatchObject({ result: 'deny', reason: 'not_granted' });
  });
  it('missing grant entirely → deny not_granted', () => {
    expect(run({ grant: undefined })).toMatchObject({ result: 'deny', reason: 'not_granted' });
  });
  it('permission deny → deny grant_deny', () => {
    expect(run({ action: 'account.change_email' })).toMatchObject({ result: 'deny', reason: 'grant_deny' });
  });
  it('permission confirm → confirm grant_confirm', () => {
    expect(run({ action: 'miles.redeem', params: { points: 30000 } })).toMatchObject({ result: 'confirm', reason: 'grant_confirm' });
  });
  it('allow without limit → allow granted', () => {
    expect(run({ action: 'flight.search' })).toMatchObject({ result: 'allow', reason: 'granted' });
  });
});

describe('policy engine: limits', () => {
  it('within amount limit → allow within_limit', () => {
    const d = run({ action: 'flight.book', params: { amount: 240, currency: 'EUR' } });
    expect(d).toMatchObject({ result: 'allow', reason: 'within_limit' });
    expect(d.message).toContain('€240');
  });
  it('exactly at the limit → allow', () => {
    expect(run({ action: 'flight.book', params: { amount: 500, currency: 'EUR' } }).result).toBe('allow');
  });
  it('over limit with overLimit confirm → confirm over_limit_confirm', () => {
    const d = run({ action: 'flight.book', params: { amount: 1400, currency: 'EUR' } });
    expect(d).toMatchObject({ result: 'confirm', reason: 'over_limit_confirm' });
    expect(d.message).toContain('€1,400');
  });
  it('over limit with default overLimit → deny over_limit', () => {
    expect(run({ action: 'order.place', params: { amount: 249, currency: 'EUR' } })).toMatchObject({ result: 'deny', reason: 'over_limit' });
  });
  it('currency mismatch → overLimit behaviour (confirm)', () => {
    expect(run({ action: 'flight.book', params: { amount: 100, currency: 'USD' } })).toMatchObject({
      result: 'confirm',
      reason: 'currency_mismatch_confirm',
    });
  });
  it('currency mismatch → overLimit behaviour (default deny)', () => {
    expect(run({ action: 'order.place', params: { amount: 10, currency: 'GBP' } })).toMatchObject({
      result: 'deny',
      reason: 'currency_mismatch',
    });
  });
  it('currency comparison is case-insensitive', () => {
    expect(run({ action: 'flight.book', params: { amount: 100, currency: 'eur' } }).result).toBe('allow');
  });
  it('missing amount on an amount limit → deny missing_param', () => {
    expect(run({ action: 'flight.book', params: { currency: 'EUR' } })).toMatchObject({ result: 'deny', reason: 'missing_param' });
  });
  it('non-numeric amount → deny missing_param', () => {
    expect(run({ action: 'flight.book', params: { amount: 'lots', currency: 'EUR' } })).toMatchObject({ result: 'deny', reason: 'missing_param' });
  });
  it('numeric string amount is accepted', () => {
    expect(run({ action: 'flight.book', params: { amount: '240', currency: 'EUR' } }).result).toBe('allow');
  });
  it('missing currency when the limit has one → deny missing_param', () => {
    expect(run({ action: 'flight.book', params: { amount: 100 } })).toMatchObject({ result: 'deny', reason: 'missing_param' });
  });
  it('amount limit without currency ignores currency', () => {
    const d = run({ action: 'booking.cancel', params: { amount: 50 }, guardrails: [] });
    expect(d.result).toBe('allow');
  });
  it('points within limit → allow', () => {
    expect(run({ action: 'miles.capped', params: { points: 30000 } }).result).toBe('allow');
  });
  it('points over limit → overLimit', () => {
    expect(run({ action: 'miles.capped', params: { points: 120000 } })).toMatchObject({ result: 'confirm', reason: 'over_limit_confirm' });
  });
  it('missing points on a points limit → deny missing_param', () => {
    expect(run({ action: 'miles.capped', params: {} })).toMatchObject({ result: 'deny', reason: 'missing_param' });
  });
});
