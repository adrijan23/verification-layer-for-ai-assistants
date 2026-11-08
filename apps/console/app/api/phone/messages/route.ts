import { NextResponse } from 'next/server';
import { z } from 'zod';
import { addPhoneMessage, listPhoneMessages } from '@/lib/phone';

export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json({ messages: listPhoneMessages(60) });
}

const SmsSchema = z.object({
  platformUserEmail: z.string().email().optional(),
  platformId: z.string().optional(),
  sender: z.string().max(60).default('Instinct'),
  title: z.string().max(140),
  body: z.string().max(600),
  link: z.string().url().optional(),
});

/** The assistant "texting" its user (e.g. relaying the connect link). */
export async function POST(req: Request) {
  const parsed = SmsSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'bad_request', issues: parsed.error.issues }, { status: 400 });
  const m = parsed.data;
  const msg = addPhoneMessage({
    userEmail: m.platformUserEmail,
    platformId: m.platformId,
    sender: m.sender,
    kind: 'sms',
    title: m.title,
    body: m.body,
    link: m.link,
  });
  return NextResponse.json({ ok: true, message: msg });
}
