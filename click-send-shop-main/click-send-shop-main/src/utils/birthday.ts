const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** 将接口/数据库生日规范为 YYYY-MM-DD；无效或空值返回空字符串 */
export function normalizeBirthdayValue(value: string | null | undefined): string {
  if (value == null || value === "") return "";
  const s = String(value).trim().slice(0, 10);
  return ISO_DATE_RE.test(s) ? s : "";
}

/** 仅当存在有效生日且锁定标记为真时，才视为已锁定 */
export function resolveBirthdayLockedState(profile: {
  birthday?: string | null;
  birthdayLocked?: boolean | number;
  birthday_locked?: boolean | number;
}): boolean {
  const normalizedBirthday = normalizeBirthdayValue(profile.birthday);
  return Boolean(normalizedBirthday) && Boolean(profile.birthdayLocked ?? profile.birthday_locked ?? false);
}
