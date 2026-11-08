import fs from 'node:fs';
import path from 'node:path';
import { parsePlatformConfig, type PlatformConfig } from '@agentgate/shared';
import { REPO_ROOT } from './env';

type G = typeof globalThis & { __agConfigs?: Map<string, PlatformConfig> };

/** Platform configs (action catalog, guardrails, limits) loaded from config/platforms/*.json. */
export function getPlatformConfigs(): Map<string, PlatformConfig> {
  const g = globalThis as G;
  if (!g.__agConfigs) {
    const dir = path.join(REPO_ROOT, 'config', 'platforms');
    const map = new Map<string, PlatformConfig>();
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort()) {
      const cfg = parsePlatformConfig(JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')));
      map.set(cfg.platformId, cfg);
    }
    g.__agConfigs = map;
  }
  return g.__agConfigs;
}

export function getPlatformConfig(id: string): PlatformConfig | undefined {
  return getPlatformConfigs().get(id);
}
