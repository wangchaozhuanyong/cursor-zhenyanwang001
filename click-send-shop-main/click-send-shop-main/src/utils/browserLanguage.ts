/** 视为中文环境的浏览器语言前缀（含简繁及粤语） */
const CHINESE_LANGUAGE_PREFIXES = ["zh", "yue"] as const;

export function normalizeBrowserLanguages(languages: Iterable<string | null | undefined>): string[] {
  return [...languages]
    .map((item) => String(item || "").trim().toLowerCase())
    .filter(Boolean);
}

export function isChineseBrowserLanguage(
  languages: Iterable<string | null | undefined> = [
    typeof navigator !== "undefined" ? navigator.language : "",
    ...(typeof navigator !== "undefined" ? navigator.languages || [] : []),
  ],
): boolean {
  const normalized = normalizeBrowserLanguages(languages);
  return normalized.some((lang) =>
    CHINESE_LANGUAGE_PREFIXES.some((prefix) => lang === prefix || lang.startsWith(`${prefix}-`)),
  );
}
