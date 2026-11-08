import { NextResponse } from 'next/server';
import { waitForConfirmation } from '@/lib/confirmations';
import { requireGateway } from '@/lib/gatewayAuth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Gateway long-poll: returns when the user decides, or after the 90 s timeout (→ expired). */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const unauth = requireGateway(req);
  if (unauth) return unauth;
  const status = await waitForConfirmation(params.id);
  return NextResponse.json({ status });
}
