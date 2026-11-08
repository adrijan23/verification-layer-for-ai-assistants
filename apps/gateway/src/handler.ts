import { randomBytes } from 'node:crypto';
import {
  LOGIN_ACTION,
  UNMAPPED_ACTION,
  isLoginPath,
  mapRequest,
  type AgentErrorBody,
  type DecideResponse,
  type PlatformConfig,
} from '@agentgate/shared';
import { callDecide, getPlatformState, postEvent, waitForConfirmation } from './console';
import { env } from './env';
import { DemoTagDetector, detectAgent, type AgentIdentity } from './identity/detect';
import { connectInterstitial, legacyBlockPage } from './pages';
import { proxyToUpstream } from './proxy';

const MAX_BODY = 1024 * 1024;
const detectors = [new DemoTagDetector(env.agentTag)];
const MONEY_ACTIONS = new Set(['flight.book', 'miles.redeem', 'booking.cancel', 'order.place', 'order.return']);

const isAsset = (p: string) => p.startsWith('/_next/') || p === '/favicon.ico' || /\.(js|css|map|png|jpe?g|gif|svg|ico|webp|woff2?|ttf)$/.test(p);

function json(body: unknown, status: number, extra?: Headers): Response {
  const h = new Headers(extra);
  h.set('content-type', 'application/json; charset=utf-8');
  return new Response(JSON.stringify(body), { status, headers: h });
}

function readCookie(req: Request, name: string): string | undefined {
  const raw = req.headers.get('cookie') ?? '';
  for (const part of raw.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return undefined;
}

function wantsHtml(req: Request, path: string): boolean {
  return !path.startsWith('/api/') && (req.headers.get('accept') ?? '').includes('text/html');
}

function identityHeaders(agent: AgentIdentity, d: DecideResponse, decision: string): Record<string, string> {
  const h: Record<string, string> = { 'x-agentgate-agent': agent.name, 'x-agentgate-decision': decision };
  if (d.principal) {
    h['x-agentgate-user'] = d.principal.email;
    h['x-agentgate-grant'] = d.principal.grantId;
  }
  return h;
}

/** Handle one request on a platform listener. Humans pass through untouched. */
export async function handle(req: Request, cfg: PlatformConfig): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname;
  const agent = detectAgent(req.headers, detectors);

  // Humans are not affected by AgentGate.
  if (!agent) return proxyToUpstream(req, cfg);

  const state = await getPlatformState(cfg.platformId);

  // 1. Gateway OFF: the platform's legacy bot rules block every automated request.
  if (!state.gatewayEnabled) {
    if (!isAsset(path)) postEvent({ kind: 'legacy_block', platformId: cfg.platformId, agentName: agent.name, method: req.method, path });
    const ref = `${randomBytes(3).toString('hex')}.${Date.now().toString(16)}`;
    if (path.startsWith('/api/')) return json({ error: 'access_denied', message: 'Automated traffic detected.' }, 403);
    return new Response(legacyBlockPage(ref), { status: 403, headers: { 'content-type': 'text/html; charset=utf-8' } });
  }

  // 3a. Agent session cookie (per platform: cookies on localhost are shared across ports).
  const cookieName = `ag_sid_${cfg.platformId}`;
  const responseHeaders = new Headers();
  let sid = readCookie(req, cookieName);
  if (!sid || !/^ag_[A-Za-z0-9_-]{6,64}$/.test(sid)) {
    sid = `ag_${randomBytes(12).toString('base64url')}`;
    responseHeaders.append('set-cookie', `${cookieName}=${sid}; Path=/; HttpOnly; SameSite=Lax`);
  }

  const login = isLoginPath(cfg, path);
  const isApi = path.startsWith('/api/');
  const method = req.method.toUpperCase();

  // 3b. Static assets and public page GETs are forwarded (agents may browse public pages).
  if (!login && (isAsset(path) || ((method === 'GET' || method === 'HEAD') && !isApi))) {
    return proxyToUpstream(req, cfg, { responseHeaders });
  }

  // 3c. Map the request to an action (buffer the body to inspect it, then forward identical bytes).
  let body: ArrayBuffer | undefined;
  let parsed: unknown;
  if (method !== 'GET' && method !== 'HEAD') {
    body = await req.arrayBuffer();
    if (body.byteLength > MAX_BODY) return json({ error: 'payload_too_large' }, 413, responseHeaders);
    try {
      parsed = body.byteLength ? JSON.parse(Buffer.from(body).toString('utf8')) : undefined;
    } catch {
      parsed = undefined;
    }
  }
  const mapped = login
    ? null
    : mapRequest(cfg, { method, path, query: Object.fromEntries(url.searchParams), body: parsed });
  const action = login ? LOGIN_ACTION : (mapped?.action ?? UNMAPPED_ACTION);
  const params = mapped?.params ?? (action === UNMAPPED_ACTION ? { method, path } : {});

  // 3d. Ask the control plane.
  let d: DecideResponse;
  try {
    d = await callDecide({ platformId: cfg.platformId, sid, agentName: agent.name, action, params, method, path, login });
  } catch (e) {
    console.error(`[gateway:${cfg.platformId}] decide failed`, e);
    return json({ error: 'agent_action_denied', reason: 'gateway_unavailable', message: 'Verification service unavailable.' } satisfies AgentErrorBody, 503, responseHeaders);
  }
  responseHeaders.set('x-agentgate-decision', d.result);

  const forward = async (decision: string) => {
    const res = await proxyToUpstream(req, cfg, { body, responseHeaders, upstreamHeaders: identityHeaders(agent, d, decision) });
    if (MONEY_ACTIONS.has(action)) postEvent({ kind: 'outcome', platformId: cfg.platformId, sid, action, params, status: res.status });
    return res;
  };

  // Shadow mode: log the decision, never enforce it.
  if (d.shadow) {
    responseHeaders.set('x-agentgate-shadow-decision', d.result);
    if (login && d.result === 'allow') return loginSuccess(req, path, d, responseHeaders);
    return forward(`shadow:${d.result}`);
  }

  // 3e. Enforce.
  switch (d.result) {
    case 'allow':
      if (login) return loginSuccess(req, path, d, responseHeaders);
      return forward('allow');

    case 'deny':
      return json({ error: 'agent_action_denied', reason: d.reason, message: d.message } satisfies AgentErrorBody, 403, responseHeaders);

    case 'throttle':
      responseHeaders.set('retry-after', String(d.retryAfterSec ?? 5));
      return json({ error: 'agent_rate_limited', reason: d.reason, message: d.message, retryAfterSec: d.retryAfterSec } satisfies AgentErrorBody, 429, responseHeaders);

    case 'connect_required': {
      const connectUrl = d.connectUrl!;
      responseHeaders.set('www-authenticate', `AgentConnect url="${connectUrl}"`);
      if (wantsHtml(req, path)) {
        responseHeaders.set('content-type', 'text/html; charset=utf-8');
        return new Response(connectInterstitial(cfg, agent.name, connectUrl, d.message, env.appName), { status: 401, headers: responseHeaders });
      }
      return json({ error: 'agent_connect_required', reason: d.reason, message: d.message, connectUrl } satisfies AgentErrorBody, 401, responseHeaders);
    }

    case 'confirm': {
      if (!d.confirmationId) {
        return json({ error: 'agent_action_denied', reason: d.reason, message: d.message } satisfies AgentErrorBody, 403, responseHeaders);
      }
      // HOLD the request until the user answers on their phone.
      const status = await waitForConfirmation(d.confirmationId);
      if (status === 'approved') return forward('approved');
      return json(
        {
          error: 'agent_action_denied_by_user',
          reason: status === 'denied' ? 'user_denied' : 'confirmation_timeout',
          message: status === 'denied' ? 'The account holder declined this on their phone.' : 'The account holder did not respond in time.',
        } satisfies AgentErrorBody,
        403,
        responseHeaders,
      );
    }
  }
}

function loginSuccess(req: Request, path: string, d: DecideResponse, headers: Headers): Response {
  if (req.method.toUpperCase() === 'GET') {
    const returnTo = new URL(req.url).searchParams.get('returnTo');
    headers.set('location', returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/?agentgate=signed-in');
    return new Response(null, { status: 302, headers });
  }
  return json({ ok: true, via: 'agentgate', user: d.principal ? { email: d.principal.email, name: d.principal.displayName } : null, message: d.message }, 200, headers);
}
