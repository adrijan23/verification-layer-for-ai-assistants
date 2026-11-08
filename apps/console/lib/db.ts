import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { env } from './env';
import { seedDatabase } from './seed';

type G = typeof globalThis & { __agDb?: Database.Database };

const SCHEMA = `
CREATE TABLE IF NOT EXISTS platforms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  brand_color TEXT NOT NULL,
  logo_url TEXT,
  gateway_enabled INTEGER NOT NULL DEFAULT 0,
  shadow_mode INTEGER NOT NULL DEFAULT 0,
  config_json TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS platform_users (
  id TEXT PRIMARY KEY,
  platform_id TEXT NOT NULL,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL,
  password TEXT NOT NULL
);
-- Passkeys belong to the person (email), so one passkey works on every platform on the network.
CREATE TABLE IF NOT EXISTS passkeys (
  id TEXT PRIMARY KEY,
  user_email TEXT NOT NULL,
  credential_id TEXT NOT NULL UNIQUE,
  public_key TEXT NOT NULL,
  counter INTEGER NOT NULL DEFAULT 0,
  transports TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS agent_sessions (
  id TEXT PRIMARY KEY,
  platform_id TEXT NOT NULL,
  agent_name TEXT NOT NULL,
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  status TEXT NOT NULL,
  grant_id TEXT
);
CREATE TABLE IF NOT EXISTS grants (
  id TEXT PRIMARY KEY,
  platform_id TEXT NOT NULL,
  platform_user_id TEXT NOT NULL,
  agent_session_id TEXT NOT NULL,
  agent_name TEXT NOT NULL,
  permissions_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  revoked_at TEXT
);
CREATE TABLE IF NOT EXISTS confirmations (
  id TEXT PRIMARY KEY,
  grant_id TEXT NOT NULL,
  agent_session_id TEXT NOT NULL,
  platform_id TEXT NOT NULL,
  action TEXT NOT NULL,
  params_json TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  decided_at TEXT
);
CREATE TABLE IF NOT EXISTS phone_messages (
  id TEXT PRIMARY KEY,
  user_email TEXT,
  platform_id TEXT,
  sender TEXT NOT NULL,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  link TEXT,
  confirmation_id TEXT,
  created_at TEXT NOT NULL,
  read_at TEXT
);
CREATE TABLE IF NOT EXISTS audit_events (
  seq INTEGER PRIMARY KEY,
  ts TEXT NOT NULL,
  platform_id TEXT NOT NULL,
  agent_session_id TEXT,
  grant_id TEXT,
  agent_name TEXT,
  action TEXT NOT NULL,
  params_json TEXT NOT NULL,
  decision TEXT NOT NULL,
  reason TEXT NOT NULL,
  message TEXT NOT NULL,
  enforced INTEGER NOT NULL DEFAULT 1,
  prev_hash TEXT NOT NULL,
  hash TEXT NOT NULL
);
-- Outcome of forwarded agent transactions (upstream status), used for revenue metrics.
CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts TEXT NOT NULL,
  platform_id TEXT NOT NULL,
  agent_session_id TEXT,
  action TEXT NOT NULL,
  amount REAL,
  currency TEXT,
  points INTEGER,
  upstream_status INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS consent_tickets (
  id TEXT PRIMARY KEY,
  sid TEXT NOT NULL,
  platform_id TEXT NOT NULL,
  platform_user_id TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TEXT NOT NULL,
  used_at TEXT
);
CREATE TABLE IF NOT EXISTS webauthn_challenges (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  kind TEXT NOT NULL,
  challenge TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS assertions (
  token TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  method TEXT NOT NULL,
  created_at TEXT NOT NULL,
  used_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_audit_platform ON audit_events(platform_id, seq);
CREATE INDEX IF NOT EXISTS idx_phone_created ON phone_messages(created_at);
`;

export function getDb(): Database.Database {
  const g = globalThis as G;
  if (!g.__agDb) {
    fs.mkdirSync(path.dirname(env.dbPath), { recursive: true });
    const db = new Database(env.dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('busy_timeout = 5000');
    db.exec(SCHEMA);
    const count = (db.prepare('SELECT COUNT(*) AS n FROM platforms').get() as { n: number }).n;
    if (count === 0) seedDatabase(db, { full: false });
    g.__agDb = db;
  }
  return g.__agDb;
}
