import { NextResponse, type NextRequest } from 'next/server';
import { getProduct } from '@/lib/data';
import { cartTotal, state } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { productId?: string; qty?: number; replace?: boolean };
  const product = body.productId ? getProduct(body.productId) : undefined;
  if (!product) return NextResponse.json({ error: 'not_found', message: 'Unknown product' }, { status: 404 });
  const qty = Math.max(1, Math.min(10, Number(body.qty) || 1));
  const s = state();
  // "Buy now" replaces the cart with this single item.
  if (body.replace) s.cart = [];
  const line = s.cart.find((c) => c.productId === product.id);
  if (line) line.qty += qty;
  else s.cart.push({ productId: product.id, qty });
  return NextResponse.json({ cart: s.cart, total: cartTotal(s.cart) });
}
