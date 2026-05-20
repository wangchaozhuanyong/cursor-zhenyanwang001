import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  ADMIN_LOCALE_STORAGE_KEY,
  getAdminMessages,
  translateAdmin,
  translateAdminText,
  type AdminLocale,
  type AdminMessages,
} from "@/i18n/admin";

const DEFAULT_ADMIN_LOCALE: AdminLocale = "zh";

type AdminI18nContextValue = {
  locale: AdminLocale;
  setLocale: (locale: AdminLocale) => void;
  messages: AdminMessages;
  t: (key: string, params?: Record<string, string | number>) => string;
  tText: (zh: string) => string;
};

const AdminI18nContext = createContext<AdminI18nContextValue | null>(null);

function readStoredLocale(): AdminLocale {
  try {
    if (localStorage.getItem(ADMIN_LOCALE_STORAGE_KEY) !== DEFAULT_ADMIN_LOCALE) {
      localStorage.setItem(ADMIN_LOCALE_STORAGE_KEY, DEFAULT_ADMIN_LOCALE);
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_ADMIN_LOCALE;
}

export function AdminI18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<AdminLocale>(() => readStoredLocale());

  const setLocale = useCallback((_next: AdminLocale) => {
    setLocaleState(DEFAULT_ADMIN_LOCALE);
    try {
      localStorage.setItem(ADMIN_LOCALE_STORAGE_KEY, DEFAULT_ADMIN_LOCALE);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale === "en" ? "en" : "zh-CN";
  }, [locale]);

  const messages = useMemo(() => getAdminMessages(locale), [locale]);

  const value = useMemo<AdminI18nContextValue>(
    () => ({
      locale,
      setLocale,
      messages,
      t: (key, params) => translateAdmin(locale, key, params),
      tText: (zh) => translateAdminText(locale, zh),
    }),
    [locale, setLocale, messages],
  );

  return (
    <AdminI18nContext.Provider value={value}>{children}</AdminI18nContext.Provider>
  );
}

export function useAdminI18nContext(): AdminI18nContextValue {
  const ctx = useContext(AdminI18nContext);
  if (!ctx) {
    throw new Error("useAdminI18nContext must be used within AdminI18nProvider");
  }
  return ctx;
}

/** Safe hook for components that may render outside admin (falls back to Chinese). */
export function useAdminI18nOptional(): AdminI18nContextValue | null {
  return useContext(AdminI18nContext);
}
