import type Database from 'better-sqlite3';
import { getPlatformConfigs } from './platforms';

export const DEMO_USER = { email: 'marko@example.com', password: 'demo', displayName: 'Marko' };

/** Platforms whose gateway starts OFF (so the demo can open on the legacy bot block). */
const GATEWAY_OFF_AT_START = new Set(['flydemo']);

const RESET_TABLES = [
  'platforms',
  'platform_users',
  'agent_sessions',
  'grants',
  'confirmations',
  'phone_messages',
  'audit_events',
  'transactions',
  'consent_tickets',
  'webauthn_challenges',
  'assertions',
];

/**
 * Reset demo state. Passkeys survive a normal reset so the presenter does not have to
 * re-register Touch ID / Windows Hello on stage; `full` wipes them too.
 */
export function seedDatabase(db: Database.Database, opts: { full: boolean }) {
  const configs = getPlatformConfigs();
  db.transaction(() => {
    for (const t of RESET_TABLES) db.prepare(`DELETE FROM ${t}`).run();
    if (opts.full) db.prepare('DELETE FROM passkeys').run();

    const insPlatform = db.prepare(
      `INSERT INTO platforms (id, name, brand_color, logo_url, gateway_enabled, shadow_mode, config_json)
       VALUES (?, ?, ?, NULL, ?, 0, ?)`,
    );
    const insUser = db.prepare(
      `INSERT INTO platform_users (id, platform_id, email, display_name, password) VALUES (?, ?, ?, ?, ?)`,
    );
    for (const cfg of configs.values()) {
      insPlatform.run(
        cfg.platformId,
        cfg.displayName,
        cfg.brand.color,
        GATEWAY_OFF_AT_START.has(cfg.platformId) ? 0 : 1,
        JSON.stringify(cfg),
      );
      insUser.run(`${cfg.platformId}_marko`, cfg.platformId, DEMO_USER.email, DEMO_USER.displayName, DEMO_USER.password);
    }
  })();
}
