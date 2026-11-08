import { LOGIN_ACTION, decide, type Decision, type DecideResponse } from '@agentgate/shared';
import { z } from 'zod';
import { appendAudit } from './audit';
import { createConfirmation } from './confirmations';
import { env } from './env';
import { getPlatformConfig } from './platforms';
import { checkRateLimit } from './ratelimit';
import { getGrant, getPlatform, setSessionStatus, touchSession } from './repo';

export const DecideRequestSchema = z.object({
  platformId: z.string(),
  sid: z.string().regex(/^ag_[A-Za-z0-9_-]{6,64}$/),
  agentName: z.string().max(80).default('Unknown agent'),
  action: z.string().max(80),
  params: z.record(z.unknown()).default({}),
  method: z.string().max(10),
  path: z.string().max(500),
  login: z.boolean().default(false),
});
export type DecideRequest = z.infer<typeof DecideRequestSchema>;

/** Load session/grant/guardrails, apply the rate limiter, run the policy engine, record the decision. */
export function handleDecide(req: DecideRequest): DecideResponse {
  const cfg = getPlatformConfig(req.platformId);
  const platform = getPlatform(req.platformId);
  if (!cfg || !platform) throw new Error(`Unknown platform ${req.platformId}`);

  const session = touchSession(req.sid, req.platformId, req.agentName);
  const grant = session.grantId ? getGrant(session.grantId) : undefined;
  const activeGrant = grant && !grant.revokedAt ? grant : undefined;
  const status = session.status === 'authorized' && !activeGrant ? 'revoked' : session.status;

  let decision: Decision;
  let retryAfterSec: number | undefined;
  if (req.login) {
    decision =
      status === 'authorized' && activeGrant
        ? {
            result: 'allow',
            reason: 'signed_in_via_agentgate',
            message: `Signed in as ${activeGrant.userName} via ${env.displayName}. No password was shared with the assistant.`,
          }
        : decide({ session: { status }, action: LOGIN_ACTION, params: {}, guardrails: [], rateLimited: false });
  } else {
    const rl = checkRateLimit(req.sid, req.action, cfg.rateLimits);
    retryAfterSec = rl.limited ? rl.retryAfterSec : undefined;
    decision = decide({
      session: { status },
      action: req.action,
      params: req.params,
      grant: activeGrant?.permissions,
      guardrails: cfg.guardrails,
      rateLimited: rl.limited,
    });
  }

  const response: DecideResponse = { ...decision, shadow: platform.shadowMode };
  if (decision.result === 'connect_required') {
    response.connectUrl = `${env.consoleUrl}/connect?sid=${encodeURIComponent(req.sid)}&p=${encodeURIComponent(req.platformId)}`;
    if (session.status === 'unverified') setSessionStatus(req.sid, 'pending');
  }
  if (decision.result === 'throttle') response.retryAfterSec = retryAfterSec ?? 5;
  if (activeGrant) {
    response.principal = { email: activeGrant.userEmail, displayName: activeGrant.userName, grantId: activeGrant.id };
  }
  if (decision.result === 'confirm' && activeGrant && !platform.shadowMode) {
    response.confirmationId = createConfirmation({
      cfg,
      grantId: activeGrant.id,
      sid: req.sid,
      action: req.action,
      params: req.params,
      userEmail: activeGrant.userEmail,
      agentName: req.agentName,
      why: decision.message,
    });
  }

  const row = appendAudit({
    platformId: req.platformId,
    agentSessionId: req.sid,
    grantId: activeGrant?.id ?? null,
    agentName: req.agentName,
    action: req.login ? LOGIN_ACTION : req.action,
    params: req.params,
    decision: decision.result,
    reason: decision.reason,
    message: decision.message,
    enforced: !platform.shadowMode,
  });
  response.auditSeq = row.seq;
  return response;
}
