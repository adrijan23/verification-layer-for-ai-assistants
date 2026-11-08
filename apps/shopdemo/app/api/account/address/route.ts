import { NextResponse, type NextRequest } from 'next/server';
import { state } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { address?: string };
  if (!body.address || body.address.trim().length < 5) {
    return NextResponse.json({ error: 'invalid_address', message: 'Enter a full address' }, { status: 400 });
  }
  state().address = body.address.trim();
  return NextResponse.json({ ok: true, address: state().address });
}
