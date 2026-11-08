import type { Permission, SessionStatus } from '@agentgate/shared';
import { getDb } from './db';
import { nowIso } from './ids';

export interface PlatformRow {
  id: string;
  name: string;
  brandColor: string;
  gatewayEnabled: boolean;
  shadowMode: boolean;
}

export function getPlatform(id: string): PlatformRow | undefined {
  const r = getDb()
    .prepare('SELECT id, name, brand_color, gateway_enabled, shadow_mode FROM platforms WHERE id = ?')
    .get(id) as { id: string; name: string; brand_color: string; gateway_enabled: number; shadow_mode: number } | undefined;
  return r && { id: r.id, name: r.name, brandColor: r.brand_color, gatewayEnabled: !!r.gateway_enabled, shadowMode: !!r.shadow_mode };
}

export function listPlatforms(): PlatformRow[] {
  const rows = getDb().prepare('SELECT id FROM platforms ORDER BY id').all() as { id: string }[];
  return rows.map((r) => getPlatform(r.id)!);
}

export function setGateway(id: string, enabled: boolean) {
  getDb().prepare('UPDATE platforms SET gateway_enabled = ? WHERE id = ?').run(enabled ? 1 : 0, id);
}

export function setShadow(id: string, shadow: boolean) {
  getDb().prepare('UPDATE platforms SET shadow_mode = ? WHERE id = ?').run(shadow ? 1 : 0, id);
}

export interface SessionRow {
  id: string;
  platformId: string;
  agentName: string;
  status: SessionStatus;
  grantId: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
}

function mapSession(r: any): SessionRow {
  return {
    id: r.id,
    platformId: r.platform_id,
    agentName: r.agent_name,
    status: r.status,
    grantId: r.grant_id,
    firstSeenAt: r.first_seen_at,
    lastSeenAt: r.last_seen_at,
  };
}

export function getSession(sid: string): SessionRow | undefined {
  const r = getDb().prepare('SELECT * FROM agent_sessions WHERE id = ?').get(sid);
  return r ? mapSession(r) : undefined;
}

/** Create the session on first sight, otherwise bump last_seen. */
export function touchSession(sid: string, platformId: string, agentName: string): SessionRow {
  const db = getDb();
  const now = nowIso();
  db.prepare(
    `INSERT INTO agent_sessions (id, platform_id, agent_name, first_seen_at, last_seen_at, status)
     VALUES (?, ?, ?, ?, ?, 'unverified')
     ON CONFLICT(id) DO UPDATE SET last_seen_at = excluded.last_seen_at`,
  ).run(sid, platformId, agentName, now, now);
  return getSession(sid)!;
}

export function setSessionStatus(sid: string, status: SessionStatus, grantId?: string | null) {
  if (grantId === undefined) getDb().prepare('UPDATE agent_sessions SET status = ? WHERE id = ?').run(status, sid);
  else getDb().prepare('UPDATE agent_sessions SET status = ?, grant_id = ? WHERE id = ?').run(status, grantId, sid);
}

export interface GrantRow {
  id: string;
  platformId: string;
  platformUserId: string;
  agentSessionId: string;
  agentName: string;
  permissions: Permission[];
  createdAt: string;
  revokedAt: string | null;
  userEmail: string;
  userName: string;
}

function mapGrant(r: any): GrantRow {
  return {
    id: r.id,
    platformId: r.platform_id,
    platformUserId: r.platform_user_id,
    agentSessionId: r.agent_session_id,
    agentName: r.agent_name,
    permissions: JSON.parse(r.permissions_json),
    createdAt: r.created_at,
    revokedAt: r.revoked_at,
    userEmail: r.email,
    userName: r.display_name,
  };
}

const GRANT_SELECT = `SELECT g.*, u.email, u.display_name FROM grants g JOIN platform_users u ON u.id = g.platform_user_id`;

export function getGrant(id: string): GrantRow | undefined {
  const r = getDb().prepare(`${GRANT_SELECT} WHERE g.id = ?`).get(id);
  return r ? mapGrant(r) : undefined;
}

export function listGrants(): GrantRow[] {
  return (getDb().prepare(`${GRANT_SELECT} ORDER BY g.created_at DESC`).all() as any[]).map(mapGrant);
}

export function listActiveGrantsForEmail(email: string): GrantRow[] {
  return (getDb().prepare(`${GRANT_SELECT} WHERE u.email = ? AND g.revoked_at IS NULL ORDER BY g.created_at DESC`).all(email) as any[]).map(
    mapGrant,
  );
}

export function getPlatformUser(platformId: string, email: string) {
  return getDb().prepare('SELECT * FROM platform_users WHERE platform_id = ? AND email = ?').get(platformId, email) as
    | { id: string; platform_id: string; email: string; display_name: string; password: string }
    | undefined;
}
