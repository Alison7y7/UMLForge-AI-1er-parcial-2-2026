function normalizedInstant(value: string): string {
  if (!value) return value;
  // Los mensajes historicos se persistieron como UTC en timestamp without time zone.
  // Si el servidor antiguo no incluyo offset, lo interpretamos como UTC, sin sumar horas a mano.
  return /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value) ? value : `${value}Z`;
}

export function parseChatInstant(value: string): Date | null {
  const date = new Date(normalizedInstant(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatChatTime(
  value: string,
  locale?: string,
  timeZone?: string
): string {
  const date = parseChatInstant(value);
  if (!date) return '';
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    ...(timeZone ? { timeZone } : {}),
  }).format(date);
}

export function chatDateKey(value: string): string {
  const date = parseChatInstant(value);
  if (!date) return '';
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

export function formatChatDateLabel(value: string, now = new Date()): string {
  const date = parseChatInstant(value);
  if (!date) return '';
  const current = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const difference = Math.round((current.getTime() - target.getTime()) / 86_400_000);
  if (difference === 0) return 'Hoy';
  if (difference === 1) return 'Ayer';
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric', month: 'short', year: 'numeric',
  }).format(date);
}
