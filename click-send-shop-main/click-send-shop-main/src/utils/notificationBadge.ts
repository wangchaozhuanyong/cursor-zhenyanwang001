export const NOTIFICATION_BADGE_MAX = 99;

export function normalizeUnreadCount(value: unknown): number {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.max(0, Math.floor(num));
}

export function formatUnreadBadge(value: unknown, max = NOTIFICATION_BADGE_MAX): string {
  const count = normalizeUnreadCount(value);
  if (count <= 0) return "";
  if (count > max) return `${max}+`;
  return String(count);
}
