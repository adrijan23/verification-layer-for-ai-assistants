import { NextResponse } from 'next/server';
import { dashboardSnapshot } from '@/lib/snapshot';

export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json(dashboardSnapshot());
}
