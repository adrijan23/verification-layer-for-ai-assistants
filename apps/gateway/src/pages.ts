import type { PlatformConfig } from '@agentgate/shared';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Generic CDN-style bot block page: what agents get today when a platform blocks automation. */
export function legacyBlockPage(ref: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Access Denied</title>
<style>
  body{margin:0;font-family:Arial,Helvetica,sans-serif;background:#fff;color:#222}
  .wrap{max-width:640px;margin:12vh auto;padding:0 24px}
  h1{font-size:28px;margin:0 0 12px;font-weight:700}
  p{line-height:1.5;color:#444}
  .ref{margin-top:28px;font-size:12px;color:#888;font-family:monospace}
  .bar{height:4px;background:#c62828;width:64px;margin-bottom:24px}
</style></head><body><div class="wrap" data-testid="legacy-block">
<div class="bar"></div>
<h1>Access Denied</h1>
<p>You don't have permission to access this page on this server.</p>
<p>Automated traffic detected. If you believe this is an error, contact the site owner.</p>
<p class="ref">Reference #${esc(ref)}</p>
</div></body></html>`;
}

/** Interstitial shown to an unverified agent on HTML requests: relay this link to your user. */
export function connectInterstitial(cfg: PlatformConfig, agentName: string, connectUrl: string, message: string, appName: string): string {
  const { color, accent, mark } = cfg.brand;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="agentgate-connect-url" content="${esc(connectUrl)}">
<title>Connect your assistant · ${esc(cfg.displayName)}</title>
<style>
  *{box-sizing:border-box}
  body{margin:0;font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;background:#F3F5F9;color:#111722}
  header{background:${color};color:#fff}
  .hin{max-width:720px;margin:0 auto;padding:18px 24px;display:flex;align-items:center;gap:12px}
  .mark{display:grid;place-items:center;width:36px;height:36px;border-radius:9px;background:rgba(255,255,255,.12);box-shadow:inset 0 -3px 0 ${accent};font-weight:700;font-size:12px}
  main{max-width:720px;margin:40px auto;padding:0 24px}
  .card{background:#fff;border-radius:18px;padding:32px;box-shadow:0 10px 30px -18px rgba(17,23,34,.4)}
  h1{font-size:24px;margin:0 0 10px}
  p{line-height:1.55;color:#3B475D;margin:0 0 12px}
  .url{display:block;margin:18px 0;padding:14px 16px;border-radius:12px;background:#F3F5F9;font-family:ui-monospace,monospace;font-size:13px;word-break:break-all;color:#111722}
  a.btn{display:inline-block;background:${color};color:#fff;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:12px}
  .foot{margin-top:18px;font-size:12px;color:#8592A8;display:flex;gap:6px;align-items:center}
</style></head><body>
<header><div class="hin"><span class="mark">${esc(mark)}</span><strong>${esc(cfg.displayName)}</strong></div></header>
<main><div class="card" data-testid="connect-interstitial">
<h1>Connect your assistant to continue</h1>
<p><b>${esc(agentName)}</b> is acting on someone’s behalf. ${esc(cfg.displayName)} lets verified assistants in, with the account holder’s permission.</p>
<p>${esc(message)} Send this one-time link to the account holder to approve it:</p>
<code class="url" data-testid="connect-url">${esc(connectUrl)}</code>
<a class="btn" href="${esc(connectUrl)}">Open approval page</a>
<div class="foot">Secured by ${esc(appName)} · no password is shared with the assistant</div>
</div></main></body></html>`;
}
