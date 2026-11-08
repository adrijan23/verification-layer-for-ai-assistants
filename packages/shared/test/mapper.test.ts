import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parsePlatformConfig } from '../src/config';
import { getPath, isLoginPath, mapRequest, matchPath } from '../src/mapper';

const root = path.resolve(__dirname, '../../..');
const load = (id: string) =>
  parsePlatformConfig(JSON.parse(fs.readFileSync(path.join(root, 'config/platforms', `${id}.json`), 'utf8')));
const fly = load('flydemo');
const shop = load('shopdemo');

describe('matchPath', () => {
  it('matches static paths', () => {
    expect(matchPath('/api/flights', '/api/flights')).toEqual({});
  });
  it('ignores a trailing slash', () => {
    expect(matchPath('/api/flights', '/api/flights/')).toEqual({});
  });
  it('captures :param segments', () => {
    expect(matchPath('/api/bookings/:id/cancel', '/api/bookings/BK42/cancel')).toEqual({ id: 'BK42' });
  });
  it('decodes captured params', () => {
    expect(matchPath('/api/orders/:id/return', '/api/orders/a%20b/return')).toEqual({ id: 'a b' });
  });
  it('rejects different lengths and segments', () => {
    expect(matchPath('/api/bookings/:id/cancel', '/api/bookings/cancel')).toBeNull();
    expect(matchPath('/api/bookings', '/api/orders')).toBeNull();
  });
});

describe('getPath', () => {
  it('reads nested values', () => {
    expect(getPath({ body: { a: { b: 3 } } }, 'body.a.b')).toBe(3);
  });
  it('returns undefined for missing or non-object values', () => {
    expect(getPath({ body: 'x' }, 'body.a')).toBeUndefined();
    expect(getPath({}, 'body.a')).toBeUndefined();
  });
});

describe('mapRequest (FlyDemo)', () => {
  it('maps flight search by method + path', () => {
    expect(mapRequest(fly, { method: 'GET', path: '/api/flights', query: { from: 'BEG' } })).toMatchObject({
      action: 'flight.search',
      risk: 'read',
    });
  });
  it('method must match', () => {
    expect(mapRequest(fly, { method: 'DELETE', path: '/api/flights' })).toBeNull();
  });
  it('`when` selects card payment → flight.book and extracts params', () => {
    const m = mapRequest(fly, {
      method: 'POST',
      path: '/api/bookings',
      body: { flightId: 'FD101', fareClass: 'economy', total: 240, currency: 'EUR', payWith: 'card' },
    });
    expect(m).toEqual({
      action: 'flight.book',
      risk: 'money',
      params: { amount: 240, currency: 'EUR', fareClass: 'economy', flightId: 'FD101' },
    });
  });
  it('`when` selects miles payment → miles.redeem', () => {
    const m = mapRequest(fly, {
      method: 'POST',
      path: '/api/bookings',
      body: { flightId: 'FD101', fareClass: 'economy', payWith: 'miles', miles: 30000 },
    });
    expect(m?.action).toBe('miles.redeem');
    expect(m?.params).toMatchObject({ points: 30000 });
  });
  it('booking body without a known payWith is unmapped', () => {
    expect(mapRequest(fly, { method: 'POST', path: '/api/bookings', body: { payWith: 'crypto' } })).toBeNull();
  });
  it('extracts path params via path.*', () => {
    const m = mapRequest(fly, { method: 'POST', path: '/api/bookings/BK7/cancel', body: { refundAmount: 240 } });
    expect(m).toMatchObject({ action: 'booking.cancel', params: { refundAmount: 240, bookingId: 'BK7' } });
  });
  it('omits params that are missing from the request', () => {
    const m = mapRequest(fly, { method: 'POST', path: '/api/bookings', body: { payWith: 'card' } });
    expect(m?.params).toEqual({});
  });
  it('unknown API → null', () => {
    expect(mapRequest(fly, { method: 'POST', path: '/api/gift-cards', body: {} })).toBeNull();
  });
});

describe('mapRequest (ShopDemo)', () => {
  it('maps order placement with amount', () => {
    expect(mapRequest(shop, { method: 'POST', path: '/api/orders', body: { amount: 89, currency: 'EUR' } })).toMatchObject({
      action: 'order.place',
      params: { amount: 89, currency: 'EUR' },
    });
  });
  it('maps returns with :id', () => {
    expect(mapRequest(shop, { method: 'POST', path: '/api/orders/O-1/return', body: { refundAmount: 89 } })?.params).toEqual({
      refundAmount: 89,
      orderId: 'O-1',
    });
  });
  it('maps address change', () => {
    expect(mapRequest(shop, { method: 'POST', path: '/api/account/address', body: { address: 'X' } })?.action).toBe(
      'account.change_address',
    );
  });
});

describe('isLoginPath', () => {
  it('detects login paths with or without trailing slash', () => {
    expect(isLoginPath(fly, '/login')).toBe(true);
    expect(isLoginPath(fly, '/login/')).toBe(true);
    expect(isLoginPath(fly, '/api/login')).toBe(true);
    expect(isLoginPath(fly, '/flights')).toBe(false);
  });
});

describe('platform configs', () => {
  it('both configs validate and every default grant refers to a known action', () => {
    for (const cfg of [fly, shop]) {
      const ids = new Set(cfg.actions.map((a) => a.id));
      for (const p of cfg.defaultGrant) expect(ids.has(p.action)).toBe(true);
      for (const g of cfg.guardrails) expect(ids.has(g.action)).toBe(true);
    }
  });
});
