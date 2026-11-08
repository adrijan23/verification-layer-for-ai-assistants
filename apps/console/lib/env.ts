import path from 'node:path';

export const REPO_ROOT = process.env.REPO_ROOT ?? path.resolve(process.cwd(), '../..');

export const env = {
  get displayName() {
    return process.env.APP_DISPLAY_NAME || 'AgentGate';
  },
  get consoleUrl() {
    return process.env.CONSOLE_URL || 'http://localhost:3000';
  },
  get agentUrl() {
    return process.env.AGENT_URL || 'http://localhost:3100';
  },
  get gatewaySecret() {
    return process.env.GATEWAY_SHARED_SECRET || 'dev-secret';
  },
  get dbPath() {
    return path.resolve(REPO_ROOT, process.env.DATABASE_PATH || './data/agentgate.db');
  },
  get passkeyFallback() {
    return process.env.DEMO_PASSKEY_FALLBACK === 'true';
  },
  get demoTools() {
    return process.env.DEMO_TOOLS === 'true';
  },
  get rpID() {
    return new URL(this.consoleUrl).hostname;
  },
  get origin() {
    return new URL(this.consoleUrl).origin;
  },
};
