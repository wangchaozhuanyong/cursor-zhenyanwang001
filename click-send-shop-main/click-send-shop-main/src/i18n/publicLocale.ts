import { createContext, useContext } from "react";

export type PublicLocale = "zh" | "en";

export type PublicMessageKey = string;

export const PUBLIC_LOCALES: Array<{
  value: PublicLocale;
  shortLabel: string;
  label: string;
  htmlLang: string;
}> = [
  { value: "zh", shortLabel: "中", label: "中文", htmlLang: "zh-CN" },
  { value: "en", shortLabel: "EN", label: "English", htmlLang: "en-MY" },
];

const PUBLIC_LOCALE_VALUES = new Set<PublicLocale>(PUBLIC_LOCALES.map((item) => item.value));
export const PUBLIC_LOCALE_STORAGE_KEY = "store-public-locale";

export type PublicLocaleContextValue = {
  locale: PublicLocale;
  pathLocale: PublicLocale | null;
  localizedPath: (path: string) => string;
  switchLocalePath: (locale: PublicLocale) => string;
  t: (key: PublicMessageKey) => string;
  promotionTypeLabel: (type: string) => string;
  formatDate: (value: string) => string;
};

export const PublicLocaleContext = createContext<PublicLocaleContextValue | null>(null);

export function isPublicLocale(value: unknown): value is PublicLocale {
  return typeof value === "string" && PUBLIC_LOCALE_VALUES.has(value.toLowerCase() as PublicLocale);
}

export function getPublicLocaleFromPathname(pathname: string): PublicLocale | null {
  const firstSegment = pathname.split("/").filter(Boolean)[0]?.toLowerCase();
  return isPublicLocale(firstSegment) ? firstSegment : null;
}

export function stripPublicLocaleFromPathname(pathname: string): string {
  const locale = getPublicLocaleFromPathname(pathname);
  if (!locale) return pathname || "/";
  const stripped = pathname.slice(locale.length + 1);
  if (!stripped) return "/";
  return stripped.startsWith("/") ? stripped : `/${stripped}`;
}

export function stripPublicLocaleFromPath(path: string): string {
  const { pathname, search, hash } = splitLocalPath(path);
  return `${stripPublicLocaleFromPathname(pathname)}${search}${hash}`;
}

export function localizePath(path: string, locale: PublicLocale): string {
  if (!path || path.startsWith("#") || /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(path)) return path;
  const { pathname, search, hash } = splitLocalPath(path);
  if (!pathname.startsWith("/")) return path;
  const canonical = stripPublicLocaleFromPathname(pathname);
  return `/${locale}${canonical === "/" ? "" : canonical}${search}${hash}`;
}

export function getLocaleAwarePath(path: string, pathLocale: PublicLocale | null, locale: PublicLocale): string {
  return pathLocale ? localizePath(path, locale) : path;
}

export function usePublicLocale() {
  const context = useContext(PublicLocaleContext);
  if (!context) {
    throw new Error("usePublicLocale must be used within PublicLocaleProvider");
  }
  return context;
}

function splitLocalPath(path: string) {
  const hashIndex = path.indexOf("#");
  const beforeHash = hashIndex >= 0 ? path.slice(0, hashIndex) : path;
  const hash = hashIndex >= 0 ? path.slice(hashIndex) : "";
  const searchIndex = beforeHash.indexOf("?");
  const pathname = searchIndex >= 0 ? beforeHash.slice(0, searchIndex) : beforeHash;
  const search = searchIndex >= 0 ? beforeHash.slice(searchIndex) : "";
  return { pathname: pathname || "/", search, hash };
}
