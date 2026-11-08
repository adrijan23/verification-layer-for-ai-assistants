import type { ActionDef, PlatformConfig } from './config';

export interface RequestShape {
  method: string;
  /** Path without query string, e.g. /api/bookings/42/cancel */
  path: string;
  query?: Record<string, string>;
  body?: unknown;
}

export interface MappedAction {
  action: string;
  risk: ActionDef['risk'];
  params: Record<string, unknown>;
}

/** Strip a trailing slash (except root). */
export function normalizePath(p: string): string {
  if (p.length > 1 && p.endsWith('/')) return p.slice(0, -1);
  return p;
}

/**
 * Match a route pattern with `:param` segments against a concrete path.
 * Returns captured params, or null if it does not match.
 */
export function matchPath(pattern: string, path: string): Record<string, string> | null {
  const pp = normalizePath(pattern).split('/');
  const sp = normalizePath(path).split('/');
  if (pp.length !== sp.length) return null;
  const out: Record<string, string> = {};
  for (let i = 0; i < pp.length; i++) {
    const seg = pp[i];
    const val = sp[i];
    if (seg.startsWith(':')) {
      if (!val) return null;
      out[seg.slice(1)] = decodeURIComponent(val);
    } else if (seg !== val) {
      return null;
    }
  }
  return out;
}

/** Read a dot-path (e.g. "body.total", "query.q", "path.id") from a source object. */
export function getPath(source: unknown, dotPath: string): unknown {
  let cur: unknown = source;
  for (const key of dotPath.split('.')) {
    if (cur === null || cur === undefined || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[key];
  }
  return cur;
}

export function isLoginPath(config: Pick<PlatformConfig, 'loginPaths'>, path: string): boolean {
  const p = normalizePath(path);
  return config.loginPaths.some((lp) => normalizePath(lp) === p);
}

/**
 * Map an HTTP request to a platform action using the platform config.
 * First matching action wins. Returns null for unmapped requests.
 */
export function mapRequest(config: Pick<PlatformConfig, 'actions'>, req: RequestShape): MappedAction | null {
  const method = req.method.toUpperCase();
  for (const def of config.actions) {
    if (def.method !== method) continue;
    const pathParams = matchPath(def.path, req.path);
    if (!pathParams) continue;
    const source = { body: req.body ?? {}, query: req.query ?? {}, path: pathParams };
    if (def.when) {
      const ok = Object.entries(def.when).every(([dp, expected]) => getPath(source, dp) === expected);
      if (!ok) continue;
    }
    const params: Record<string, unknown> = {};
    for (const [name, dp] of Object.entries(def.params ?? {})) {
      const v = getPath(source, dp);
      if (v !== undefined) params[name] = v;
    }
    return { action: def.id, risk: def.risk, params };
  }
  return null;
}
