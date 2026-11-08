import { NextResponse, type NextRequest } from 'next/server';
import { listAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const events = listAudit({
    platformId: q.get('platformId') ?? undefined,
    limit: Number(q.get('limit') ?? 50),
    beforeSeq: q.get('before') ? Number(q.get('before')) : undefined,
  });
  return NextResponse.json({ events, nextBefore: events.length ? events[events.length - 1].seq : null });
}
