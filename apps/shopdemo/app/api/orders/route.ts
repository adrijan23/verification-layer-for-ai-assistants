import { NextResponse, type NextRequest } from 'next/server';
import { actorFrom, cartTotal, nextOrderId, state, type CartItem } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { items?: CartItem[]; amount?: number; currency?: string } | null;
  if (!body?.items?.length) return NextResponse.json({ error: 'empty_cart', message: 'Your cart is empty' }, { status: 400 });
  const total = cartTotal(body.items);
  // The marketplace prices the order itself; a mismatching client amount is rejected.
  if (body.currency !== 'EUR' || body.amount !== total) {
    return NextResponse.json({ error: 'price_mismatch', message: `Order total is €${total}` }, { status: 400 });
  }
  const s = state();
  const id = nextOrderId();
  s.orders.unshift({
    id,
    items: body.items,
    amount: total,
    status: 'confirmed',
    address: s.address,
    placedBy: actorFrom(req.headers),
    createdAt: new Date().toISOString(),
  });
  s.cart = [];
  return NextResponse.json({ orderId: id, status: 'confirmed', amount: total });
}
