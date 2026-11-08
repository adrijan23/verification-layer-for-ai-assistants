import { z } from 'zod';
import { GuardrailSchema, PermissionSchema } from './types';

export const ActionDefSchema = z.object({
  id: z.string().min(1),
  label: z.string().optional(),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
  path: z.string().startsWith('/'),
  /** dot-path (body.x / query.x / path.x) → expected value */
  when: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
  /** param name → dot-path */
  params: z.record(z.string()).optional(),
  risk: z.enum(['read', 'money', 'account']),
});
export type ActionDef = z.infer<typeof ActionDefSchema>;

export const RateLimitSchema = z.object({
  action: z.string().min(1),
  perMinute: z.number().int().positive(),
});
export type RateLimit = z.infer<typeof RateLimitSchema>;

export const PlatformConfigSchema = z.object({
  platformId: z.string().regex(/^[a-z0-9-]+$/),
  displayName: z.string(),
  upstream: z.string().url(),
  listenPort: z.number().int(),
  publicUrl: z.string().url(),
  brand: z.object({ color: z.string(), accent: z.string(), mark: z.string() }),
  loginPaths: z.array(z.string()).default([]),
  actions: z.array(ActionDefSchema),
  guardrails: z.array(GuardrailSchema).default([]),
  rateLimits: z.array(RateLimitSchema).default([]),
  defaultGrant: z.array(PermissionSchema).default([]),
});
export type PlatformConfig = z.infer<typeof PlatformConfigSchema>;

export function parsePlatformConfig(raw: unknown): PlatformConfig {
  return PlatformConfigSchema.parse(raw);
}

export function actionLabel(config: PlatformConfig, actionId: string): string {
  return config.actions.find((a) => a.id === actionId)?.label ?? actionId;
}

export function actionRisk(config: PlatformConfig, actionId: string): 'read' | 'money' | 'account' | undefined {
  return config.actions.find((a) => a.id === actionId)?.risk;
}
