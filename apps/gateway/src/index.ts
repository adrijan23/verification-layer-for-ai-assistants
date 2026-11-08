import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { loadPlatformConfigs } from './env';
import { handle } from './handler';

for (const cfg of loadPlatformConfigs()) {
  const app = new Hono();
  app.all('*', async (c) => {
    try {
      return await handle(c.req.raw, cfg);
    } catch (e) {
      console.error(`[gateway:${cfg.platformId}] error`, e);
      return c.text(`${cfg.displayName} is temporarily unavailable`, 502);
    }
  });
  serve({ fetch: app.fetch, port: cfg.listenPort });
  console.log(`[gateway] ${cfg.displayName} → :${cfg.listenPort} (upstream ${cfg.upstream})`);
}
