import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';
import { getDb } from './db';
import { env } from './env';
import { newId, nowIso } from './ids';

type RegistrationResponse = Parameters<typeof verifyRegistrationResponse>[0]['response'];
type AuthenticationResponse = Parameters<typeof verifyAuthenticationResponse>[0]['response'];
type Transports = NonNullable<Parameters<typeof generateAuthenticationOptions>[0]>['allowCredentials'];

interface PasskeyRow {
  id: string;
  user_email: string;
  credential_id: string;
  public_key: string;
  counter: number;
  transports: string | null;
}

export function listPasskeys(email: string): PasskeyRow[] {
  return getDb().prepare('SELECT * FROM passkeys WHERE user_email = ?').all(email) as PasskeyRow[];
}

function saveChallenge(email: string, kind: 'register' | 'auth', challenge: string): string {
  const id = newId('ch');
  getDb()
    .prepare('INSERT INTO webauthn_challenges (id, email, kind, challenge, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(id, email, kind, challenge, nowIso());
  return id;
}

function takeChallenge(id: string, kind: 'register' | 'auth'): { email: string; challenge: string } | null {
  const db = getDb();
  const r = db.prepare('SELECT * FROM webauthn_challenges WHERE id = ? AND kind = ?').get(id, kind) as
    | { email: string; challenge: string; created_at: string }
    | undefined;
  if (!r) return null;
  db.prepare('DELETE FROM webauthn_challenges WHERE id = ?').run(id);
  if (Date.now() - new Date(r.created_at).getTime() > 5 * 60_000) return null;
  return { email: r.email, challenge: r.challenge };
}

/** Short-lived proof that the user just approved something on their device. */
export function issueAssertion(email: string, method: 'passkey' | 'passkey_register' | 'demo_fallback'): string {
  const token = newId('as', 18);
  getDb().prepare('INSERT INTO assertions (token, email, method, created_at) VALUES (?, ?, ?, ?)').run(token, email, method, nowIso());
  return token;
}

/** Consume an assertion token once. Returns the method used, or null if invalid. */
export function consumeAssertion(token: string, email: string): string | null {
  const db = getDb();
  const r = db.prepare('SELECT * FROM assertions WHERE token = ?').get(token) as
    | { email: string; method: string; created_at: string; used_at: string | null }
    | undefined;
  if (!r || r.used_at || r.email !== email) return null;
  if (Date.now() - new Date(r.created_at).getTime() > 5 * 60_000) return null;
  const res = db.prepare('UPDATE assertions SET used_at = ? WHERE token = ? AND used_at IS NULL').run(nowIso(), token);
  return res.changes === 1 ? r.method : null;
}

export async function registrationOptions(email: string, displayName: string) {
  const existing = listPasskeys(email);
  const options = await generateRegistrationOptions({
    rpName: env.displayName,
    rpID: env.rpID,
    userName: email,
    userDisplayName: displayName,
    attestationType: 'none',
    excludeCredentials: existing.map((p) => ({ id: p.credential_id, transports: p.transports ? JSON.parse(p.transports) : undefined })),
    authenticatorSelection: { residentKey: 'preferred', userVerification: 'preferred' },
  });
  return { challengeId: saveChallenge(email, 'register', options.challenge), options };
}

export async function verifyRegistration(challengeId: string, response: RegistrationResponse) {
  const ch = takeChallenge(challengeId, 'register');
  if (!ch) return { ok: false as const, error: 'Challenge expired. Try again.' };
  const v = await verifyRegistrationResponse({
    response,
    expectedChallenge: ch.challenge,
    expectedOrigin: env.origin,
    expectedRPID: env.rpID,
    requireUserVerification: false,
  });
  if (!v.verified || !v.registrationInfo) return { ok: false as const, error: 'Passkey could not be verified.' };
  const { credential } = v.registrationInfo;
  getDb()
    .prepare(
      `INSERT INTO passkeys (id, user_email, credential_id, public_key, counter, transports, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      newId('pk'),
      ch.email,
      credential.id,
      Buffer.from(credential.publicKey).toString('base64url'),
      credential.counter,
      JSON.stringify(credential.transports ?? response.response.transports ?? []),
      nowIso(),
    );
  return { ok: true as const, email: ch.email, token: issueAssertion(ch.email, 'passkey_register') };
}

export async function authenticationOptions(email: string) {
  const existing = listPasskeys(email);
  const options = await generateAuthenticationOptions({
    rpID: env.rpID,
    userVerification: 'preferred',
    allowCredentials: existing.map((p) => ({
      id: p.credential_id,
      transports: p.transports ? JSON.parse(p.transports) : undefined,
    })) as Transports,
  });
  return { challengeId: saveChallenge(email, 'auth', options.challenge), options };
}

export async function verifyAuthentication(challengeId: string, response: AuthenticationResponse) {
  const ch = takeChallenge(challengeId, 'auth');
  if (!ch) return { ok: false as const, error: 'Challenge expired. Try again.' };
  const pk = listPasskeys(ch.email).find((p) => p.credential_id === response.id);
  if (!pk) return { ok: false as const, error: 'This passkey is not registered for this account.' };
  const v = await verifyAuthenticationResponse({
    response,
    expectedChallenge: ch.challenge,
    expectedOrigin: env.origin,
    expectedRPID: env.rpID,
    requireUserVerification: false,
    credential: {
      id: pk.credential_id,
      publicKey: new Uint8Array(Buffer.from(pk.public_key, 'base64url')),
      counter: pk.counter,
      transports: pk.transports ? JSON.parse(pk.transports) : undefined,
    },
  });
  if (!v.verified) return { ok: false as const, error: 'Passkey could not be verified.' };
  getDb().prepare('UPDATE passkeys SET counter = ? WHERE id = ?').run(v.authenticationInfo.newCounter, pk.id);
  return { ok: true as const, email: ch.email, token: issueAssertion(ch.email, 'passkey') };
}
