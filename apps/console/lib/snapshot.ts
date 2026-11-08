import { summarizeParams } from '@agentgate/shared';
import { listAudit, verifyAuditChain } from './audit';
import { getDb } from './db';
import { env } from './env';
import { getPlatformConfig } from './platforms';
import { listGrants, listPlatforms } from './repo';

const REVENUE_ACTIONS = ['flight.book', 'order.place'];
const PURCHASE_ACTIONS = ['flight.book', 'miles.redeem', 'order.place'];

export interface PlatformStats {
  sessions: number;
  allowed: number;
  blocked: number;
  confirmations: number;
  throttled: number;
  legacyBlocked: number;
  completed: number;
  revenue: number;
}

function statsFor(platformId: string): PlatformStats {
  const db = getDb();
  const one = (sql: string, ...args: unknown[]) => (db.prepare(sql).get(platformId, ...args) as { n: number | null }).n ?? 0;
  return {
    sessions: one('SELECT COUNT(*) AS n FROM agent_sessions WHERE platform_id = ?'),
    allowed: one(
      `SELECT COUNT(*) AS n FROM audit_events WHERE platform_id = ? AND decision IN ('allow','approved')
       AND action NOT IN ('auth.login','grant.created')`,
    ),
    blocked: one(
      `SELECT COUNT(*) AS n FROM audit_events WHERE platform_id = ? AND decision IN ('deny','denied_by_user')
       AND reason != 'legacy_bot_block'`,
    ),
    confirmations: one(`SELECT COUNT(*) AS n FROM audit_events WHERE platform_id = ? AND decision = 'confirm'`),
    throttled: one(`SELECT COUNT(*) AS n FROM audit_events WHERE platform_id = ? AND decision = 'throttle'`),
    legacyBlocked: one(`SELECT COUNT(*) AS n FROM audit_events WHERE platform_id = ? AND reason = 'legacy_bot_block'`),
    completed: one(
      `SELECT COUNT(*) AS n FROM transactions WHERE platform_id = ? AND upstream_status BETWEEN 200 AND 299
       AND action IN (${PURCHASE_ACTIONS.map(() => '?').join(',')})`,
      ...PURCHASE_ACTIONS,
    ),
    revenue: one(
      `SELECT SUM(amount) AS n FROM transactions WHERE platform_id = ? AND upstream_status BETWEEN 200 AND 299
       AND action IN (${REVENUE_ACTIONS.map(() => '?').join(',')})`,
      ...REVENUE_ACTIONS,
    ),
  };
}

export function dashboardSnapshot() {
  const platforms = listPlatforms().map((p) => {
    const cfg = getPlatformConfig(p.id)!;
    return {
      id: p.id,
      name: p.name,
      brand: cfg.brand,
      publicUrl: cfg.publicUrl,
      gatewayEnabled: p.gatewayEnabled,
      shadowMode: p.shadowMode,
      stats: statsFor(p.id),
    };
  });
  const totals = platforms.reduce(
    (t, p) => {
      for (const k of Object.keys(t) as (keyof PlatformStats)[]) t[k] += p.stats[k];
      return t;
    },
    { sessions: 0, allowed: 0, blocked: 0, confirmations: 0, throttled: 0, legacyBlocked: 0, completed: 0, revenue: 0 } as PlatformStats,
  );
  const grants = listGrants().map((g) => {
    const cfg = getPlatformConfig(g.platformId)!;
    return {
      id: g.id,
      platformId: g.platformId,
      platformName: cfg.displayName,
      agentName: g.agentName,
      userName: g.userName,
      userEmail: g.userEmail,
      createdAt: g.createdAt,
      revokedAt: g.revokedAt,
      permissions: g.permissions.map((p) => ({
        action: p.action,
        label: cfg.actions.find((a) => a.id === p.action)?.label ?? p.action,
        mode: p.mode,
        limit: p.limit,
        overLimit: p.overLimit,
      })),
    };
  });
  const audit = listAudit({ limit: 120 }).map((e) => ({ ...e, summary: summarizeParams(e.params) }));
  const labels: Record<string, string> = {
    'auth.login': 'Sign in',
    'grant.created': 'Assistant connected',
    'grant.revoked': 'Access revoked',
    'http.request': 'Page request',
    __unmapped__: 'Unknown API call',
  };
  for (const p of platforms) for (const a of getPlatformConfig(p.id)!.actions) labels[a.id] = a.label ?? a.id;
  return {
    displayName: env.displayName,
    demoTools: env.demoTools,
    labels,
    platforms,
    totals,
    grants,
    audit,
    chain: verifyAuditChain(),
  };
}

export type DashboardSnapshot = ReturnType<typeof dashboardSnapshot>;
