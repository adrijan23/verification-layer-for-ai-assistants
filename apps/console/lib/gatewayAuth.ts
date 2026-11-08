import { NextResponse } from 'next/server';
import { env } from './env';

/** Gateway-only endpoints require the shared secret header. Returns an error response or null. */
export function requireGateway(req: Request): NextResponse | null {
  if (req.headers.get('x-gateway-secret') !== env.gatewaySecret) {
    return NextResponse.json({ error: 'unauthorized', message: 'Missing or invalid gateway secret' }, { status: 401 });
  }
  return null;
}
