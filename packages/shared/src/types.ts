import { z } from 'zod';

export const ModeSchema = z.enum(['allow', 'confirm', 'deny']);
export type Mode = z.infer<typeof ModeSchema>;

export const LimitSchema = z.object({
  amount: z.number().nonnegative().optional(),
  currency: z.string().length(3).optional(),
  points: z.number().nonnegative().optional(),
});
export type Limit = z.infer<typeof LimitSchema>;

export const PermissionSchema = z.object({
  action: z.string().min(1),
  mode: ModeSchema,
  limit: LimitSchema.optional(),
  overLimit: z.enum(['confirm', 'deny']).optional(),
});
export type Permission = z.infer<typeof PermissionSchema>;

export const GuardrailSchema = PermissionSchema.extend({
  reason: z.string().optional(),
});
export type Guardrail = z.infer<typeof GuardrailSchema>;

export type SessionStatus = 'unverified' | 'pending' | 'authorized' | 'revoked';

export type DecisionResult = 'allow' | 'deny' | 'confirm' | 'throttle' | 'connect_required';

/** Everything that can appear in the audit log. */
export type AuditDecision =
  | DecisionResult
  | 'approved'
  | 'denied_by_user'
  | 'expired'
  | 'revoked';

export interface Decision {
  result: DecisionResult;
  /** Machine code, e.g. within_limit, over_limit_confirm, platform_guardrail */
  reason: string;
  /** Human text shown in the dashboard / phone / agent narration */
  message: string;
}

/** Special action id for API calls that are not in the platform's action catalog. */
export const UNMAPPED_ACTION = '__unmapped__';
/** Special action id for agent requests to a platform login path. */
export const LOGIN_ACTION = 'auth.login';

export type Risk = 'read' | 'money' | 'account';

/** Response of POST /api/decide (console → gateway). */
export interface DecideResponse extends Decision {
  auditSeq?: number;
  connectUrl?: string;
  confirmationId?: string;
  retryAfterSec?: number;
  /** Set when the session is authorized: who the agent acts for. */
  principal?: { email: string; displayName: string; grantId: string };
  /** True when the platform runs in shadow mode (decision logged, not enforced). */
  shadow?: boolean;
}

/** Error body the gateway returns to agents. Demo sites render it as a banner. */
export interface AgentErrorBody {
  error:
    | 'agent_connect_required'
    | 'agent_action_denied'
    | 'agent_action_denied_by_user'
    | 'agent_rate_limited';
  reason?: string;
  message: string;
  connectUrl?: string;
  retryAfterSec?: number;
}
