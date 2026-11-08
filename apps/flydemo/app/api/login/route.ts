import { NextResponse, type NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

// Demo: the human visitor is always signed in as Marko. Agents never reach this route:
// the gateway replaces password login for agents with the AgentGate connect flow.
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { email?: string; password?: string };
  if (body.email === 'marko@example.com' && body.password === 'demo') {
    return NextResponse.json({ ok: true, user: { name: 'Marko', email: body.email } });
  }
  return NextResponse.json({ error: 'invalid_credentials', message: 'Wrong email or password' }, { status: 401 });
}
