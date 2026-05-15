/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { DEFAULT_SKIN_ID, THEME_PRESETS } from "@/constants/themePresets";
import { THEME_REVISION_KEY } from "@/lib/themeRevision";
import { normalizeMediaUrls } from "@/utils/mediaUrl";
import { generateThemePalette } from "@/utils/themeContrast";
import { normalizeThemeConfig, normalizeThemeSkinsPayload } from "@/utils/themeConfig";
import type { ThemeConfig, ThemeSkin } from "@/types/theme";
import { toastErrorMessage } from "@/utils/errorMessage";

type ThemeMode = "light" | "dark";

const SKIN_STORAGE_KEY = "theme_skin_id";
const SKIN_MANUAL_KEY = "theme_skin_manual";
const LAST_ACTIVE_SKIN_KEY = "theme_last_active_skin";
const SKINS_CACHE_KEY = "theme_cached_skins";

type ThemeContextValue = {
  theme: ThemeMode;
  skinId: string;
  skins: ThemeSkin[];
  switchableSkins: ThemeSkin[];
  setSkinId: (id: string) => void;
  themeConfig: ThemeConfig;
  themeReady: boolean;
};

const ThemeRuntimeContext = createContext<ThemeContextValue | null>(null);

function isAdminScope() {
  return typeof window !== "undefined" && window.location.pathname.startsWith("/admin");
}

function applyThemeDataAttributes(root: HTMLElement, config: ThemeConfig) {
  root.setAttribute("data-theme-button-style", config.buttonStyle);
  root.setAttribute("data-theme-nav-style", config.navStyle);
  root.setAttribute("data-theme-product-card-variant", config.productCardVariant);
  root.setAttribute("data-theme-badge-style", config.badgeStyle);
  root.setAttribute("data-theme-price-style", config.priceStyle);
  root.setAttribute("data-theme-home-layout", config.homeLayout);
  root.setAttribute("data-theme-header-style", config.headerStyle);
  root.setAttribute("data-theme-banner-style", config.bannerStyle);
  root.setAttribute("data-theme-coupon-style", config.couponStyle);
  root.setAttribute("data-theme-member-card-style", config.memberCardStyle);
  root.setAttribute("data-theme-category-icon-style", config.categoryIconStyle);
  root.setAttribute("data-theme-motion-level", config.motionLevel);
  root.setAttribute("data-theme-density", config.density);
}

export function ThemeRuntimeProvider({ children }: { children: ReactNode }) {
  const initial = getInitialThemeState();
  const [skins, setSkins] = useState<ThemeSkin[]>(initial.skins);
  const [skinId, setSkinIdState] = useState<string>(initial.skinId);
  const [themeConfig, setThemeConfig] = useState<ThemeConfig>(initial.themeConfig);
  const [themeReady, setThemeReady] = useState(initial.ready);

  const switchableSkins = useMemo(
    () => skins.filter((skin) => skin.clientEnabled !== false),
    [skins],
  );

  const loadTheme = useCallback(async () => {
    const base = import.meta.env.VITE_API_BASE_URL ?? "/api";
    try {
      const response = await fetch(`${base}/theme/skins`, {
        cache: "no-store",
        credentials: "same-origin",
        headers: { Accept: "application/json" },
      });
      if (!response.ok) throw new Error(`Request failed (${response.status})`);
      const body = (await response.json()) as {
        code?: number;
        message?: string;
        data?: unknown;
        traceId?: string;
      };
      if (typeof body.code === "number" && body.code !== 0) {
        throw new Error(body.message || "Load theme skins failed");
      }

      const raw = normalizeMediaUrls((body.data ?? {}) as object, base) as {
        defaultSkinId?: string;
        activeSkinId?: string;
        skins?: ThemeSkin[];
      };
      const normalized = normalizeThemeSkinsPayload(raw);
      setSkins(normalized.skins);
      if (typeof window !== "undefined") {
        localStorage.setItem(SKINS_CACHE_KEY, JSON.stringify(normalized.skins));
      }

      const saved = typeof window !== "undefined" ? localStorage.getItem(SKIN_STORAGE_KEY) : null;
      const isManual = typeof window !== "undefined" && localStorage.getItem(SKIN_MANUAL_KEY) === "1";
      const currentActive = normalized.activeSkinId || normalized.defaultSkinId || DEFAULT_SKIN_ID;
      const lastActive = typeof window !== "undefined" ? localStorage.getItem(LAST_ACTIVE_SKIN_KEY) : null;
      const activeChangedByAdmin = !!lastActive && currentActive !== lastActive;
      if (typeof window !== "undefined") {
        localStorage.setItem(LAST_ACTIVE_SKIN_KEY, currentActive);
      }
      const canUseManual = isManual && !activeChangedByAdmin && saved && normalized.skins.some((s) => s.id === saved && s.clientEnabled !== false);
      if (isManual && activeChangedByAdmin && typeof window !== "undefined") {
        localStorage.removeItem(SKIN_MANUAL_KEY);
      }
      const chosen = canUseManual ? saved! : currentActive;
      setSkinIdState(chosen);
      const active = normalized.skins.find((s) => s.id === chosen) ?? normalized.skins[0];
      setThemeConfig(normalizeThemeConfig(active?.config));
      setThemeReady(true);
    } catch (error) {
      const fallback = normalizeThemeSkinsPayload({
        defaultSkinId: DEFAULT_SKIN_ID,
        activeSkinId: DEFAULT_SKIN_ID,
        skins: THEME_PRESETS,
      });
      setSkins(fallback.skins);
      setSkinIdState(DEFAULT_SKIN_ID);
      setThemeConfig(normalizeThemeConfig(fallback.skins.find((s) => s.id === DEFAULT_SKIN_ID)?.config));
      setThemeReady(true);
      toast.error(toastErrorMessage(error, "皮肤加载失败，已回退默认皮肤"));
    }
  }, []);

  useEffect(() => {
    void loadTheme();
  }, [loadTheme]);

  useEffect(() => {
    const onBump = () => void loadTheme();
    const onStorage = (event: StorageEvent) => {
      if (event.key === THEME_REVISION_KEY) onBump();
    };
    window.addEventListener("app:theme-updated", onBump);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("app:theme-updated", onBump);
      window.removeEventListener("storage", onStorage);
    };
  }, [loadTheme]);

  useEffect(() => {
    const active = skins.find((s) => s.id === skinId) ?? skins[0];
    setThemeConfig(normalizeThemeConfig(active?.config));
  }, [skinId, skins]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("dark");
    applyThemeDataAttributes(root, themeConfig);

    if (typeof window !== "undefined") {
      localStorage.setItem(SKIN_STORAGE_KEY, skinId);
    }

    const palette = generateThemePalette(themeConfig);
    Object.entries(palette).forEach(([key, value]) => root.style.setProperty(key, value));
  }, [themeConfig, skinId]);

  useEffect(() => {
    const syncScope = () => {
      const root = document.documentElement;
      const palette = generateThemePalette(themeConfig);
      Object.entries(palette).forEach(([key, value]) => root.style.setProperty(key, value));
      applyThemeDataAttributes(root, themeConfig);
    };
    syncScope();
    window.addEventListener("app:scope-changed", syncScope);
    return () => window.removeEventListener("app:scope-changed", syncScope);
  }, [themeConfig]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: "light",
      skinId,
      skins,
      switchableSkins,
      setSkinId: (id: string) => {
        if (!switchableSkins.some((skin) => skin.id === id)) return;
        setSkinIdState(id);
        if (typeof window !== "undefined") {
          localStorage.setItem(SKIN_STORAGE_KEY, id);
          localStorage.setItem(SKIN_MANUAL_KEY, "1");
        }
      },
      themeConfig,
      themeReady,
    }),
    [skinId, skins, switchableSkins, themeConfig, themeReady],
  );

  return <ThemeRuntimeContext.Provider value={value}>{children}</ThemeRuntimeContext.Provider>;
}

function getInitialThemeState() {
  if (typeof window === "undefined") {
    return {
      skins: THEME_PRESETS,
      skinId: DEFAULT_SKIN_ID,
      themeConfig: normalizeThemeConfig(THEME_PRESETS[0]?.config),
      ready: false,
    };
  }
  const cachedSkins = readCachedSkins();
  const saved = localStorage.getItem(SKIN_STORAGE_KEY) || localStorage.getItem(LAST_ACTIVE_SKIN_KEY) || "";
  const sourceSkins = cachedSkins.length > 0 ? cachedSkins : THEME_PRESETS;
  const active = sourceSkins.find((skin) => skin.id === saved) ?? (cachedSkins.length > 0 ? sourceSkins[0] : null);

  if (active) {
    return {
      skins: sourceSkins,
      skinId: active.id,
      themeConfig: normalizeThemeConfig(active.config),
      ready: true,
    };
  }

  return {
    skins: THEME_PRESETS,
    skinId: DEFAULT_SKIN_ID,
    themeConfig: normalizeThemeConfig(THEME_PRESETS[0]?.config),
    ready: false,
  };
}

function readCachedSkins(): ThemeSkin[] {
  try {
    const raw = localStorage.getItem(SKINS_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function useThemeRuntime() {
  const context = useContext(ThemeRuntimeContext);
  if (!context) throw new Error("useThemeRuntime must be used within ThemeRuntimeProvider");
  return context;
}
