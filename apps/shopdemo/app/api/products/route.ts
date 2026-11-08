import { NextResponse, type NextRequest } from 'next/server';
import { searchProducts } from '@/lib/data';

export const dynamic = 'force-dynamic';

export function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? '';
  return NextResponse.json({ q, products: searchProducts(q) });
}
