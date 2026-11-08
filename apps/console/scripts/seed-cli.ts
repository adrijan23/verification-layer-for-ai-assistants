// `pnpm seed` — reset demo state. Prefers the running console (so in-memory state such as
// rate limiters is reset too); falls back to writing the database directly.
import 'dotenv/config';
import dotenv from 'dotenv';
import path from 'node:path';

dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

const full = process.argv.includes('--full');
const consoleUrl = process.env.CONSOLE_URL || 'http://localhost:3000';

async function main() {
  try {
    const res = await fetch(`${consoleUrl}/api/demo/reset${full ? '?full=1' : ''}`, { method: 'POST' });
    if (res.ok) {
      console.log(`Demo reset via running console (${consoleUrl}).`);
      return;
    }
  } catch {
    // console not running
  }
  const { getDb } = await import('../lib/db');
  const { seedDatabase } = await import('../lib/seed');
  seedDatabase(getDb(), { full });
  console.log('Demo database seeded directly.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
