import { useEffect, useMemo, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import {
  getLocaleAwarePath,
  getPublicLocaleFromPathname,
  localizePath,
  messages,
  promotionTypeLabels,
  PUBLIC_LOCALE_STORAGE_KEY,
  PUBLIC_LOCALES,
  PublicLocaleContext,
  stripPublicLocaleFromPathname,
  type PublicLocale,
  type PublicLocaleContextValue,
  type PublicMessageKey,
} from "./publicLocale";

export function PublicLocaleProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const pathLocale = getPublicLocaleFromPathname(location.pathname);
  const locale = pathLocale || "zh";

  useEffect(() => {
    const config = PUBLIC_LOCALES.find((item) => item.value === locale);
    document.documentElement.lang = config?.htmlLang || "zh-CN";
    if (pathLocale) {
      window.localStorage.setItem(PUBLIC_LOCALE_STORAGE_KEY, locale);
    }
  }, [locale, pathLocale]);

  const value = useMemo<PublicLocaleContextValue>(() => {
    const t = (key: PublicMessageKey) => messages[locale][key] || messages.zh[key] || key;
    const localizedPath = (path: string) => getLocaleAwarePath(path, pathLocale, locale);
    const switchLocalePath = (nextLocale: PublicLocale) => (
      localizePath(
        `${stripPublicLocaleFromPathname(location.pathname)}${location.search}${location.hash}`,
        nextLocale,
      )
    );
    const promotionTypeLabel = (type: string) => (
      promotionTypeLabels[locale][type] || promotionTypeLabels.zh[type] || type
    );
    const formatDate = (value: string) => {
      if (!value) return t("promotion.lifetime");
      const dateLocale = locale === "zh" ? "zh-CN" : "en-MY";
      return new Intl.DateTimeFormat(dateLocale, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(value));
    };

    return {
      locale,
      pathLocale,
      localizedPath,
      switchLocalePath,
      t,
      promotionTypeLabel,
      formatDate,
    };
  }, [locale, location.hash, location.pathname, location.search, pathLocale]);

  return (
    <PublicLocaleContext.Provider value={value}>
      {children}
    </PublicLocaleContext.Provider>
  );
}
