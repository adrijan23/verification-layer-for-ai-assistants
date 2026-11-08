import { NextResponse, type NextRequest } from 'next/server';
import { state } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = (await req.json().catch(() => ({}))) as { refundAmount?: number };
  const o = state().orders.find((x) => x.id === params.id);
  if (!o) return NextResponse.json({ error: 'not_found', message: 'Order not found' }, { status: 404 });
  o.status = 'return_requested';
  o.refundAmount = typeof body.refundAmount === 'number' ? body.refundAmount : o.amount;
  return NextResponse.json({ orderId: o.id, status: o.status, refundAmount: o.refundAmount });
}
