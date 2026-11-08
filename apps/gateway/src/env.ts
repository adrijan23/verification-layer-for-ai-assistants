import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { parsePlatformConfig, type PlatformConfig } from '@agentgate/shared';

export const REPO_ROOT = process.env.REPO_ROOT ?? path.resolve(process.cwd(), '../..');
dotenv.config({ path: path.join(REPO_ROOT, '.env') });

export const env = {
  consoleUrl: process.env.CONSOLE_URL || 'http://localhost:3000',
  /** Internal URL the gateway uses to reach the console (same container in Docker). */
  consoleInternalUrl: process.env.CONSOLE_INTERNAL_URL || process.env.CONSOLE_URL || 'http://localhost:3000',
  gatewaySecret: process.env.GATEWAY_SHARED_SECRET || 'dev-secret',
  agentTag: process.env.AGENT_USER_AGENT_TAG || 'InstinctDemo/1.0',
  appName: process.env.APP_DISPLAY_NAME || 'AgentGate',
};

export function loadPlatformConfigs(): PlatformConfig[] {
  const dir = path.join(REPO_ROOT, 'config', 'platforms');
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => parsePlatformConfig(JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))));
}
