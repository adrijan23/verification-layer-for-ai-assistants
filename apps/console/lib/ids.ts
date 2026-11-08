import { randomBytes } from 'node:crypto';

export function newId(prefix: string, bytes = 9): string {
  return `${prefix}_${randomBytes(bytes).toString('base64url')}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}
