import fs from 'node:fs';
import path from 'node:path';
import type { Page } from 'playwright';

export const URLS = {
  console: process.env.CONSOLE_URL || 'http://localhost:3000',
  agent: process.env.AGENT_URL || 'http://localhost:3100',
  fly: 'http://localhost:4001',
  shop: 'http://localhost:4002',
};

export const OUT = path.resolve(process.env.REPO_ROOT || process.cwd(), 'test-output');

export function shooter(phase: string) {
  const dir = path.join(OUT, phase);
  fs.mkdirSync(dir, { recursive: true });
  let n = 0;
  return async (page: Page, name: string, fullPage = false) => {
    n += 1;
    const file = path.join(dir, `${String(n).padStart(2, '0')}-${name}.png`);
    await page.screenshot({ path: file, fullPage });
    console.log(`  📸 ${path.relative(OUT, file)}`);
    return file;
  };
}

let failures = 0;
export function check(cond: unknown, label: string) {
  if (cond) console.log(`  ✓ ${label}`);
  else {
    failures += 1;
    console.log(`  ✗ ${label}`);
  }
}
export function failed() {
  return failures;
}

export async function post(url: string, body?: unknown, headers: Record<string, string> = {}) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  return { status: res.status, json };
}
