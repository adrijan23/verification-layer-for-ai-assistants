import { formatMoney, formatPoints } from './format';
import { UNMAPPED_ACTION, type Decision, type Guardrail, type Permission, type SessionStatus } from './types';

export interface DecideInput {
  session: { status: SessionStatus };
  action: string;
  params: Record<string, unknown>;
  grant?: Permission[];
  guardrails: Guardrail[];
  rateLimited: boolean;
}

function findFor<T extends { action: string }>(list: T[] | undefined, action: string): T | undefined {
  if (!list) return undefined;
  return list.find((p) => p.action === action) ?? list.find((p) => p.action === '*');
}

function num(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v);
  return undefined;
}

/**
 * The AgentGate policy engine. Pure function; first matching rule wins:
 * 1. session not authorized → connect_required
 * 2. rate limited → throttle
 * 3. unmapped API call → deny
 * 4. platform guardrail → its mode
 * 5. no permission in grant → deny (not_granted)
 * 6. permission deny / confirm
 * 7. permission allow with limit → within limit allow, else overLimit (default deny)
 * 8. permission allow → allow
 */
export function decide(input: DecideInput): Decision {
  const { session, action, params, grant, guardrails, rateLimited } = input;

  if (session.status !== 'authorized') {
    if (session.status === 'revoked') {
      return {
        result: 'connect_required',
        reason: 'grant_revoked',
        message: 'The user revoked this assistant. A new approval is required.',
      };
    }
    return {
      result: 'connect_required',
      reason: session.status === 'pending' ? 'approval_pending' : 'not_connected',
      message: 'This assistant is not connected to the account yet. The user must approve it.',
    };
  }

  if (rateLimited) {
    return { result: 'throttle', reason: 'rate_limited', message: 'Too many requests from this assistant. Slow down.' };
  }

  if (action === UNMAPPED_ACTION) {
    return { result: 'deny', reason: 'unmapped_action', message: 'This action is not in the platform catalog for agents.' };
  }

  const guard = findFor(guardrails, action);
  if (guard && guard.mode !== 'allow') {
    const msg = guard.reason ?? 'Blocked by platform policy.';
    return guard.mode === 'deny'
      ? { result: 'deny', reason: 'platform_guardrail', message: msg }
      : { result: 'confirm', reason: 'platform_guardrail', message: msg };
  }

  const perm = findFor(grant, action);
  if (!perm) {
    return { result: 'deny', reason: 'not_granted', message: 'The user did not grant this permission.' };
  }

  if (perm.mode === 'deny') {
    return { result: 'deny', reason: 'grant_deny', message: 'The user does not allow the assistant to do this.' };
  }
  if (perm.mode === 'confirm') {
    return { result: 'confirm', reason: 'grant_confirm', message: 'The user asked to approve this every time.' };
  }

  const limit = perm.limit;
  if (!limit) return { result: 'allow', reason: 'granted', message: 'Allowed by the user’s grant.' };

  const overLimit = perm.overLimit ?? 'deny';
  const exceed = (reason: string, message: string): Decision =>
    overLimit === 'confirm'
      ? { result: 'confirm', reason: `${reason}_confirm`, message: `${message} Needs the user’s approval.` }
      : { result: 'deny', reason, message };

  if (limit.amount !== undefined) {
    const amount = num(params.amount);
    if (amount === undefined) {
      return { result: 'deny', reason: 'missing_param', message: 'Amount is missing, so the limit cannot be checked.' };
    }
    if (limit.currency !== undefined) {
      const currency = params.currency;
      if (typeof currency !== 'string' || currency === '') {
        return { result: 'deny', reason: 'missing_param', message: 'Currency is missing, so the limit cannot be checked.' };
      }
      if (currency.toUpperCase() !== limit.currency.toUpperCase()) {
        return exceed('currency_mismatch', `Currency ${currency} does not match the ${limit.currency} limit.`);
      }
    }
    if (amount > limit.amount) {
      return exceed(
        'over_limit',
        `${formatMoney(amount, limit.currency)} is above the ${formatMoney(limit.amount, limit.currency)} limit.`,
      );
    }
  }

  if (limit.points !== undefined) {
    const points = num(params.points);
    if (points === undefined) {
      return { result: 'deny', reason: 'missing_param', message: 'Points are missing, so the limit cannot be checked.' };
    }
    if (points > limit.points) {
      return exceed('over_limit', `${formatPoints(points)} is above the ${formatPoints(limit.points)} limit.`);
    }
  }

  const amount = num(params.amount);
  return {
    result: 'allow',
    reason: 'within_limit',
    message:
      amount !== undefined && limit.amount !== undefined
        ? `${formatMoney(amount, limit.currency)} is within the ${formatMoney(limit.amount, limit.currency)} limit.`
        : 'Within the user’s limit.',
  };
}
