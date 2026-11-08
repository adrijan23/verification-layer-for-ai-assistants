import type { PlatformConfig } from '@agentgate/shared';

const HOP_BY_HOP = ['connection', 'keep-alive', 'transfer-encoding', 'upgrade', 'proxy-connection', 'te', 'trailer'];

export interface ProxyOptions {
  /** Pre-read request body (we buffer mapped API bodies to inspect them). */
  body?: ArrayBuffer;
  /** Headers added to the upstream request (identity propagation). */
  upstreamHeaders?: Record<string, string>;
  /** Headers added to the response returned to the client. */
  responseHeaders?: Headers;
}

/** Forward a request to the platform upstream and stream the response back. */
export async function proxyToUpstream(req: Request, cfg: PlatformConfig, opts: ProxyOptions = {}): Promise<Response> {
  const url = new URL(req.url);
  const target = new URL(url.pathname + url.search, cfg.upstream);

  const headers = new Headers(req.headers);
  for (const h of [...HOP_BY_HOP, 'host', 'content-length']) headers.delete(h);
  // Never trust identity headers coming from the outside.
  for (const k of [...headers.keys()]) if (k.toLowerCase().startsWith('x-agentgate-')) headers.delete(k);
  headers.set('accept-encoding', 'identity');
  headers.set('x-forwarded-host', url.host);
  headers.set('x-forwarded-proto', url.protocol.replace(':', ''));
  for (const [k, v] of Object.entries(opts.upstreamHeaders ?? {})) headers.set(k, v);

  const method = req.method.toUpperCase();
  const hasBody = method !== 'GET' && method !== 'HEAD';
  const body = hasBody ? (opts.body ?? (await req.arrayBuffer())) : undefined;

  const upstream = await fetch(target, { method, headers, body, redirect: 'manual' });

  const out = new Headers();
  upstream.headers.forEach((value, key) => {
    const k = key.toLowerCase();
    if (HOP_BY_HOP.includes(k) || k === 'content-encoding' || k === 'content-length' || k === 'set-cookie') return;
    out.set(key, value);
  });
  for (const c of upstream.headers.getSetCookie()) out.append('set-cookie', c);
  const loc = out.get('location');
  if (loc && loc.startsWith(cfg.upstream)) out.set('location', cfg.publicUrl + loc.slice(cfg.upstream.length));
  opts.responseHeaders?.forEach((value, key) => {
    if (key.toLowerCase() === 'set-cookie') out.append(key, value);
    else out.set(key, value);
  });

  return new Response(upstream.body, { status: upstream.status, statusText: upstream.statusText, headers: out });
}
