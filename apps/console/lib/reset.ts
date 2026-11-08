import { publish } from './bus';
import { getDb } from './db';
import { getPlatformConfigs } from './platforms';
import { resetRateLimits } from './ratelimit';
import { seedDatabase } from './seed';

/** Reset everything for a fresh demo run: DB, rate limiters, and the demo platforms' own state. */
export async function resetDemo(full = false) {
  seedDatabase(getDb(), { full });
  resetRateLimits();
  await Promise.all(
    [...getPlatformConfigs().values()].map((cfg) =>
      fetch(`${cfg.upstream}/api/demo/reset`, { method: 'POST' }).catch(() => null),
    ),
  );
  publish({ type: 'state', reason: 'reset' });
}
