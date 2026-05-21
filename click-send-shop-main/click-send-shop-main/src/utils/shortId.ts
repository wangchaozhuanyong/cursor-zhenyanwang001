/** 列表展示用：长 ID 仅保留尾部，避免整段 UUID 撑破表格。 */
export function shortId(value?: string | null, tail = 6): string {
  const raw = String(value || "").trim();
  if (!raw) return "—";
  if (raw.length <= tail + 4) return raw;
  return `…${raw.slice(-tail)}`;
}
