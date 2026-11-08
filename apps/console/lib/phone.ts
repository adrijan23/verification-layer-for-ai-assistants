import { publish } from './bus';
import { getDb } from './db';
import { newId, nowIso } from './ids';

export interface PhoneMessageDTO {
  id: string;
  kind: 'sms' | 'approval';
  sender: string;
  title: string;
  body: string;
  link: string | null;
  platformId: string | null;
  confirmationId: string | null;
  confirmationStatus: string | null;
  createdAt: string;
}

const SELECT = `SELECT m.*, c.status AS confirmation_status FROM phone_messages m
  LEFT JOIN confirmations c ON c.id = m.confirmation_id`;

function toDTO(r: any): PhoneMessageDTO {
  return {
    id: r.id,
    kind: r.kind,
    sender: r.sender,
    title: r.title,
    body: r.body,
    link: r.link,
    platformId: r.platform_id,
    confirmationId: r.confirmation_id,
    confirmationStatus: r.confirmation_status ?? null,
    createdAt: r.created_at,
  };
}

export function addPhoneMessage(m: {
  userEmail?: string | null;
  platformId?: string | null;
  sender: string;
  kind: 'sms' | 'approval';
  title: string;
  body: string;
  link?: string | null;
  confirmationId?: string | null;
}): PhoneMessageDTO {
  const id = newId('msg');
  getDb()
    .prepare(
      `INSERT INTO phone_messages (id, user_email, platform_id, sender, kind, title, body, link, confirmation_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(id, m.userEmail ?? null, m.platformId ?? null, m.sender, m.kind, m.title, m.body, m.link ?? null, m.confirmationId ?? null, nowIso());
  const dto = getPhoneMessage(id)!;
  publish({ type: 'phone', message: dto });
  return dto;
}

export function getPhoneMessage(id: string): PhoneMessageDTO | undefined {
  const r = getDb().prepare(`${SELECT} WHERE m.id = ?`).get(id);
  return r ? toDTO(r) : undefined;
}

export function listPhoneMessages(limit = 50): PhoneMessageDTO[] {
  return (getDb().prepare(`${SELECT} ORDER BY m.created_at DESC LIMIT ?`).all(limit) as any[]).map(toDTO).reverse();
}

/** Re-publish approval cards for a confirmation whose status changed. */
export function publishConfirmationUpdate(confirmationId: string) {
  const rows = getDb().prepare(`${SELECT} WHERE m.confirmation_id = ?`).all(confirmationId) as any[];
  for (const r of rows) publish({ type: 'phone_update', message: toDTO(r) });
}
