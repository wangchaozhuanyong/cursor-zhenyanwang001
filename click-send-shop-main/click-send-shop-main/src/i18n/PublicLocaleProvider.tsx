import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import {
  getLocaleAwarePath,
  getPublicLocaleFromPathname,
  localizePath,
  PUBLIC_LOCALE_STORAGE_KEY,
  PUBLIC_LOCALES,
  PublicLocaleContext,
  stripPublicLocaleFromPathname,
  type PublicLocale,
  type PublicLocaleContextValue,
  type PublicMessageKey,
} from "./publicLocale";
import { promotionTypeLabelsZh, publicMessagesZh } from "./publicLocaleMessages.zh";

type EnglishLocaleBundle = typeof import("./publicLocaleMessages.en");

let englishLocaleBundlePromise: Promise<EnglishLocaleBundle> | null = null;

function loadEnglishLocaleBundle() {
  englishLocaleBundlePromise ??= import("./publicLocaleMessages.en");
  return englishLocaleBundlePromise;
}

export function PublicLocaleProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const pathLocale = getPublicLocaleFromPathname(location.pathname);
  const locale = pathLocale || "zh";
  const [englishBundle, setEnglishBundle] = useState<EnglishLocaleBundle | null>(null);

  useEffect(() => {
    const config = PUBLIC_LOCALES.find((item) => item.value === locale);
    document.documentElement.lang = config?.htmlLang || "zh-CN";
    if (pathLocale) {
      window.localStorage.setItem(PUBLIC_LOCALE_STORAGE_KEY, locale);
    }
  }, [locale, pathLocale]);

  useEffect(() => {
    if (locale !== "en" || englishBundle) return undefined;
    let cancelled = false;
    void loadEnglishLocaleBundle().then((bundle) => {
      if (!cancelled) setEnglishBundle(bundle);
    });
    return () => {
      cancelled = true;
    };
  }, [englishBundle, locale]);

  const value = useMemo<PublicLocaleContextValue>(() => {
    const activeMessages = locale === "en" ? englishBundle?.publicMessagesEn : publicMessagesZh;
    const activePromotionTypeLabels = locale === "en" ? englishBundle?.promotionTypeLabelsEn : promotionTypeLabelsZh;
    const t = (key: PublicMessageKey) => activeMessages?.[key] || publicMessagesZh[key] || key;
    const localizedPath = (path: string) => getLocaleAwarePath(path, pathLocale, locale);
    const switchLocalePath = (nextLocale: PublicLocale) => (
      localizePath(
        `${stripPublicLocaleFromPathname(location.pathname)}${location.search}${location.hash}`,
        nextLocale,
      )
    );
    const promotionTypeLabel = (type: string) => (
      activePromotionTypeLabels?.[type] || promotionTypeLabelsZh[type] || type
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
  }, [englishBundle, locale, location.hash, location.pathname, location.search, pathLocale]);

  return (
    <PublicLocaleContext.Provider value={value}>
      {children}
    </PublicLocaleContext.Provider>
  );
}
