import { PermissionSchema, type Permission, type PlatformConfig } from '@agentgate/shared';
import { z } from 'zod';
import { appendAudit } from './audit';
import { publish } from './bus';
import { getDb } from './db';
import { newId, nowIso } from './ids';
import { getGrant, getSession, setSessionStatus } from './repo';

export const PermissionsInputSchema = z.array(PermissionSchema).max(50);

/**
 * Sanitize user-edited permissions: only actions in the platform catalog, and actions locked by a
 * platform deny-guardrail are stored as deny (the guardrail overrides anyway).
 */
export function sanitizePermissions(cfg: PlatformConfig, perms: Permission[]): Permission[] {
  const known = new Set(cfg.actions.map((a) => a.id));
  const locked = new Set(cfg.guardrails.filter((g) => g.mode === 'deny').map((g) => g.action));
  return perms
    .filter((p) => known.has(p.action))
    .map((p) => (locked.has(p.action) ? { action: p.action, mode: 'deny' as const } : p));
}

export function createGrant(input: {
  cfg: PlatformConfig;
  sid: string;
  platformUserId: string;
  permissions: Permission[];
  method: string;
}): string {
  const session = getSession(input.sid);
  if (!session) throw new Error('Unknown agent session');
  const id = newId('gr');
  const db = getDb();
  db.transaction(() => {
    // A session holds one active grant: supersede an older one (e.g. after revoke + reconnect).
    if (session.grantId) db.prepare('UPDATE grants SET revoked_at = COALESCE(revoked_at, ?) WHERE id = ?').run(nowIso(), session.grantId);
    db.prepare(
      `INSERT INTO grants (id, platform_id, platform_user_id, agent_session_id, agent_name, permissions_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(id, input.cfg.platformId, input.platformUserId, input.sid, session.agentName, JSON.stringify(input.permissions), nowIso());
  })();
  setSessionStatus(input.sid, 'authorized', id);
  appendAudit({
    platformId: input.cfg.platformId,
    agentSessionId: input.sid,
    grantId: id,
    agentName: session.agentName,
    action: 'grant.created',
    params: { permissions: input.permissions, method: input.method },
    decision: 'allow',
    reason: 'user_granted',
    message: `The user connected ${session.agentName} with ${input.permissions.length} permissions (${input.method === 'demo_fallback' ? 'demo fallback' : 'passkey'}).`,
  });
  publish({ type: 'state', reason: 'grant_created' });
  return id;
}

export function revokeGrant(grantId: string, by: 'dashboard' | 'phone'): boolean {
  const grant = getGrant(grantId);
  if (!grant || grant.revokedAt) return false;
  getDb().prepare('UPDATE grants SET revoked_at = ? WHERE id = ?').run(nowIso(), grantId);
  setSessionStatus(grant.agentSessionId, 'revoked');
  appendAudit({
    platformId: grant.platformId,
    agentSessionId: grant.agentSessionId,
    grantId,
    agentName: grant.agentName,
    action: 'grant.revoked',
    params: { by },
    decision: 'revoked',
    reason: 'user_revoked',
    message: `${grant.userName} revoked ${grant.agentName}’s access from the ${by}.`,
  });
  publish({ type: 'state', reason: 'grant_revoked' });
  return true;
}
