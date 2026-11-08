import dotenv from 'dotenv';
import path from 'node:path';

export const REPO_ROOT = process.env.REPO_ROOT ?? path.resolve(process.cwd(), '../..');
dotenv.config({ path: path.join(REPO_ROOT, '.env') });

export const env = {
  consoleUrl: process.env.CONSOLE_URL || 'http://localhost:3000',
  agentTag: process.env.AGENT_USER_AGENT_TAG || 'InstinctDemo/1.0',
  headless: process.env.AGENT_HEADLESS !== 'false',
  model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5',
  hasLlm: Boolean(process.env.ANTHROPIC_API_KEY),
  port: Number(process.env.AGENT_PORT || 3100),
};

export const PLATFORMS = {
  flydemo: { id: 'flydemo', name: 'FlyDemo', base: 'http://localhost:4001' },
  shopdemo: { id: 'shopdemo', name: 'ShopDemo', base: 'http://localhost:4002' },
} as const;
export type PlatformKey = keyof typeof PLATFORMS;

export const DEMO_USER_EMAIL = 'marko@example.com';
