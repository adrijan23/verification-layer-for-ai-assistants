const SYMBOLS: Record<string, string> = { EUR: '€', USD: '$', GBP: '£' };

export function formatMoney(amount: number, currency = 'EUR'): string {
  const sym = SYMBOLS[currency];
  const n = amount.toLocaleString('en-US', { maximumFractionDigits: 2 });
  return sym ? `${sym}${n}` : `${n} ${currency}`;
}

export function formatPoints(points: number): string {
  return `${points.toLocaleString('en-US')} miles`;
}

/** Short, human summary of action params for feeds and approval prompts. */
export function summarizeParams(params: Record<string, unknown> | undefined): string {
  if (!params) return '';
  const parts: string[] = [];
  if (typeof params.from === 'string' && typeof params.to === 'string') parts.push(`${params.from} → ${params.to}`);
  if (typeof params.amount === 'number') parts.push(formatMoney(params.amount, String(params.currency ?? 'EUR')));
  if (typeof params.points === 'number') parts.push(formatPoints(params.points));
  if (typeof params.refundAmount === 'number') parts.push(`refund ${formatMoney(params.refundAmount)}`);
  if (typeof params.fareClass === 'string') parts.push(params.fareClass);
  if (typeof params.email === 'string') parts.push(`→ ${params.email}`);
  if (typeof params.address === 'string') parts.push(`→ ${params.address}`);
  if (typeof params.q === 'string') parts.push(`"${params.q}"`);
  return parts.join(' · ');
}
