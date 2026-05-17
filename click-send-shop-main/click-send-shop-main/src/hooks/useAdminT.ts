import { useAdminI18nContext, useAdminI18nOptional } from "@/contexts/AdminI18nProvider";
import { translateAdmin, translateAdminText, type AdminLocale } from "@/i18n/admin";

export function useAdminT() {
  return useAdminI18nContext();
}

/** Use inside admin when provider is guaranteed; same API. */
export { useAdminI18nContext as useAdminTStrict };

export function useAdminTOptional() {
  const ctx = useAdminI18nOptional();
  const locale: AdminLocale = ctx?.locale ?? "zh";
  return {
    locale,
    setLocale: ctx?.setLocale ?? (() => {}),
    t: (key: string, params?: Record<string, string | number>) =>
      ctx?.t(key, params) ?? translateAdmin("zh", key, params),
    tText: (zh: string) => ctx?.tText(zh) ?? translateAdminText("zh", zh),
    hasProvider: Boolean(ctx),
  };
}
