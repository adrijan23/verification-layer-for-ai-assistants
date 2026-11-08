import { describe, expect, it } from 'vitest';
import { GENESIS_HASH, canonicalJSON, computeAuditHash, verifyChain, type AuditPayload, type AuditRow } from '../src/audit';

function buildChain(n: number): AuditRow[] {
  const rows: AuditRow[] = [];
  let prev = GENESIS_HASH;
  for (let i = 1; i <= n; i++) {
    const payload: AuditPayload = {
      seq: i,
      ts: `2026-11-08T10:00:0${i}.000Z`,
      platformId: 'flydemo',
      agentSessionId: 'ag_x',
      grantId: i > 1 ? 'gr_1' : null,
      action: i === 1 ? 'auth.login' : 'flight.book',
      params: { amount: 240 * i, currency: 'EUR' },
      decision: 'allow',
      reason: 'within_limit',
      message: 'ok',
      enforced: true,
    };
    const hash = computeAuditHash(prev, payload);
    rows.push({ ...payload, prevHash: prev, hash });
    prev = hash;
  }
  return rows;
}

describe('canonicalJSON', () => {
  it('sorts keys recursively and drops undefined', () => {
    expect(canonicalJSON({ b: 1, a: { d: 2, c: [3, { f: 1, e: 0 }] }, u: undefined })).toBe(
      '{"a":{"c":[3,{"e":0,"f":1}],"d":2},"b":1}',
    );
  });
  it('is stable regardless of insertion order', () => {
    expect(canonicalJSON({ x: 1, y: 2 })).toBe(canonicalJSON({ y: 2, x: 1 }));
  });
});

describe('audit hash chain', () => {
  it('a fresh chain verifies', () => {
    const rows = buildChain(5);
    const v = verifyChain(rows);
    expect(v).toMatchObject({ ok: true, count: 5 });
    expect(v.headHash).toBe(rows[4].hash);
    expect(rows[0].prevHash).toBe(GENESIS_HASH);
  });
  it('an empty chain verifies', () => {
    expect(verifyChain([])).toMatchObject({ ok: true, count: 0 });
  });
  it('order of input does not matter (sorted by seq)', () => {
    expect(verifyChain(buildChain(4).reverse()).ok).toBe(true);
  });
  it('editing params is detected at that row', () => {
    const rows = buildChain(5);
    rows[2] = { ...rows[2], params: { amount: 1, currency: 'EUR' } };
    expect(verifyChain(rows)).toMatchObject({ ok: false, brokenAtSeq: 3 });
  });
  it('editing the decision is detected', () => {
    const rows = buildChain(3);
    rows[1] = { ...rows[1], decision: 'deny' };
    expect(verifyChain(rows)).toMatchObject({ ok: false, brokenAtSeq: 2 });
  });
  it('recomputing one row hash still breaks the link to the next row', () => {
    const rows = buildChain(4);
    const forged = { ...rows[1], params: { amount: 9999 } };
    forged.hash = computeAuditHash(forged.prevHash, forged);
    rows[1] = forged;
    expect(verifyChain(rows)).toMatchObject({ ok: false, brokenAtSeq: 3 });
  });
  it('deleting a row is detected', () => {
    const rows = buildChain(4);
    rows.splice(1, 1);
    expect(verifyChain(rows)).toMatchObject({ ok: false, brokenAtSeq: 3 });
  });
});
