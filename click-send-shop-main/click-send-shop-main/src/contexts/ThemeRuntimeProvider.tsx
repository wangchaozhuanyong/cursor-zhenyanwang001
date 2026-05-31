import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  ADMIN_SAFE_THEME_OVERRIDES,
  DEFAULT_SKIN_ID,
  THEME_PRESETS,
} from "@/constants/themePresets";
import { THEME_REVISION_KEY } from "@/lib/themeRevision";
import { normalizeMediaUrls } from "@/utils/mediaUrl";
import { generateThemePalette } from "@/utils/themeContrast";
import { normalizeThemeConfig, normalizeThemeSkinsPayload, resolveRuntimeThemeSkinId } from "@/utils/themeConfig";
import type { ThemeConfig, ThemeSkin } from "@/types/theme";

type ThemeMode = "light" | "dark";

const SKIN_STORAGE_KEY = "theme_skin_id";
const SKIN_MANUAL_KEY = "theme_skin_manual";
const LAST_ACTIVE_SKIN_KEY = "theme_last_active_skin";
const SKINS_CACHE_KEY = "theme_cached_skins";

type ThemeContextValue = {
  theme: ThemeMode;
  skinId: string;
  skins: ThemeSkin[];
  /** 瀹㈡埛绔毊鑲ら€夋嫨鍣細浠?clientEnabled 鐨勭毊鑲?*/
  switchableSkins: ThemeSkin[];
  /** 鐨偆閫夋嫨鍣ㄥ垪琛紙鍚庡彴鍚叏閮ㄧ毊鑲わ紝鍓嶅彴鍚?switchableSkins锛?*/
  pickerSkins: ThemeSkin[];
  setSkinId: (id: string) => void;
  themeConfig: ThemeConfig;
  /** 鏈湴缂撳瓨涓婚宸插簲鐢紝鍙覆鏌?UI */
  themeReady: boolean;
  /** 宸插畬鎴愯嚦灏戜竴娆℃湇鍔＄涓婚鍚屾锛岄伩鍏嶉椤靛竷灞€鍦ㄥ埛鏂版椂浠庣紦瀛橀棯鍒扮嚎涓婇厤缃?*/
  themeSynced: boolean;
};

const ThemeRuntimeContext = createContext<ThemeContextValue | null>(null);

function isAdminScope() {
  return typeof window !== "undefined" && window.location.pathname.startsWith("/admin");
}

function resolveThemeConfigForScope(
  config: ThemeConfig,
  _skinId: string,
  inAdmin: boolean,
  options?: { adminManualPreview?: boolean },
): ThemeConfig {
  if (!inAdmin) return config;
  /** 后台手动预览某套皮肤时展示真实配色，不因 safe 覆盖被压成同一套灰白 */
  if (options?.adminManualPreview) return config;
  return normalizeThemeConfig({ ...config, ...ADMIN_SAFE_THEME_OVERRIDES });
}

function applyThemeDataAttributes(root: HTMLElement, config: ThemeConfig, skin?: ThemeSkin | null) {
  if (skin?.id) root.setAttribute("data-theme-skin-id", skin.id);
  else root.removeAttribute("data-theme-skin-id");
  if (skin?.sceneTag) root.setAttribute("data-theme-scene", skin.sceneTag);
  else root.removeAttribute("data-theme-scene");
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
  root.setAttribute("data-theme-admin-mode", config.adminThemeMode);
}

export function ThemeRuntimeProvider({ children }: { children: ReactNode }) {
  const initial = getInitialThemeState();
  const [skins, setSkins] = useState<ThemeSkin[]>(initial.skins);
  const [skinId, setSkinIdState] = useState<string>(initial.skinId);
  const [themeConfig, setThemeConfig] = useState<ThemeConfig>(initial.themeConfig);
  const [themeReady, setThemeReady] = useState(initial.ready);
  const [themeSynced, setThemeSynced] = useState(false);
  const [inAdminScope, setInAdminScope] = useState(() => isAdminScope());
  const [adminManualSkinPick, setAdminManualSkinPick] = useState(
    () => typeof window !== "undefined" && isAdminScope() && localStorage.getItem(SKIN_MANUAL_KEY) === "1",
  );

  const switchableSkins = useMemo(
    () => (inAdminScope ? skins.filter((skin) => skin.clientEnabled !== false) : []),
    [inAdminScope, skins],
  );

  const pickerSkins = useMemo(
    () => (inAdminScope ? skins : []),
    [inAdminScope, skins],
  );

  useEffect(() => {
    const syncScope = () => setInAdminScope(isAdminScope());
    syncScope();
    window.addEventListener("app:scope-changed", syncScope);
    return () => window.removeEventListener("app:scope-changed", syncScope);
  }, []);

  const loadTheme = useCallback(async () => {
    const base = import.meta.env.VITE_API_BASE_URL ?? "/api";
    try {
      const response = await fetch(`${base}/theme/skins?_=${Date.now()}`, {
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
        runtimeSkinId?: string;
        holidaySkinId?: string;
        holidayRules?: ReturnType<typeof normalizeThemeSkinsPayload>["holidayRules"];
        skins?: ThemeSkin[];
      };
      const normalized = normalizeThemeSkinsPayload(raw);
      setSkins(normalized.skins);
      if (typeof window !== "undefined") {
        localStorage.setItem(SKINS_CACHE_KEY, JSON.stringify(normalized.skins));
      }

      const inAdmin = isAdminScope();
      const runtimeSkinId = normalized.runtimeSkinId || resolveRuntimeThemeSkinId(normalized);
      const currentActive = inAdmin
        ? normalized.activeSkinId || normalized.defaultSkinId || DEFAULT_SKIN_ID
        : runtimeSkinId || normalized.activeSkinId || normalized.defaultSkinId || DEFAULT_SKIN_ID;
      const lastActive = typeof window !== "undefined" ? localStorage.getItem(LAST_ACTIVE_SKIN_KEY) : null;
      const activeChangedByAdmin = !!lastActive && currentActive !== lastActive;
      if (typeof window !== "undefined") {
        localStorage.setItem(LAST_ACTIVE_SKIN_KEY, currentActive);
      }
      const skinExists = (id: string) => normalized.skins.some((s) => s.id === id);
      let chosen = skinExists(currentActive) ? currentActive : normalized.defaultSkinId;

      if (!inAdmin) {
        setAdminManualSkinPick(false);
        if (typeof window !== "undefined") {
          localStorage.removeItem(SKIN_MANUAL_KEY);
          localStorage.setItem(SKIN_STORAGE_KEY, chosen);
        }
      } else {
        const saved = typeof window !== "undefined" ? localStorage.getItem(SKIN_STORAGE_KEY) : null;
        const isManual = typeof window !== "undefined" && localStorage.getItem(SKIN_MANUAL_KEY) === "1";
        if (isManual && saved) {
          if (!skinExists(saved)) {
            if (typeof window !== "undefined") localStorage.removeItem(SKIN_MANUAL_KEY);
            setAdminManualSkinPick(false);
            chosen = skinExists(currentActive) ? currentActive : normalized.defaultSkinId;
          } else if (activeChangedByAdmin) {
            if (typeof window !== "undefined") localStorage.removeItem(SKIN_MANUAL_KEY);
            setAdminManualSkinPick(false);
            chosen = currentActive;
          } else {
            chosen = saved;
            setAdminManualSkinPick(true);
          }
        } else {
          setAdminManualSkinPick(false);
        }
      }

      setSkinIdState(chosen);
      const active = normalized.skins.find((s) => s.id === chosen) ?? normalized.skins[0];
      setThemeConfig(normalizeThemeConfig(active?.config));
      setThemeReady(true);
      setThemeSynced(true);
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
      setThemeSynced(true);
      console.warn("[theme] failed to sync skins, fallback applied", error);
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

  const appliedConfig = useMemo(
    () =>
      resolveThemeConfigForScope(themeConfig, skinId, inAdminScope, {
        adminManualPreview: inAdminScope && adminManualSkinPick,
      }),
    [themeConfig, skinId, inAdminScope, adminManualSkinPick],
  );

  const appliedSkin = useMemo(() => skins.find((s) => s.id === skinId) ?? skins[0] ?? null, [skinId, skins]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("dark");
    applyThemeDataAttributes(root, appliedConfig, appliedSkin);

    if (typeof window !== "undefined") {
      localStorage.setItem(SKIN_STORAGE_KEY, skinId);
    }

    const palette = generateThemePalette(appliedConfig);
    Object.entries(palette).forEach(([key, value]) => root.style.setProperty(key, value));
  }, [appliedConfig, appliedSkin, skinId]);

  useEffect(() => {
    const syncScope = () => {
      const root = document.documentElement;
      const currentSkin = skins.find((s) => s.id === skinId) ?? skins[0] ?? null;
      const scoped = resolveThemeConfigForScope(themeConfig, skinId, isAdminScope(), {
        adminManualPreview: isAdminScope() && adminManualSkinPick,
      });
      const palette = generateThemePalette(scoped);
      Object.entries(palette).forEach(([key, value]) => root.style.setProperty(key, value));
      applyThemeDataAttributes(root, scoped, currentSkin);
    };
    syncScope();
    window.addEventListener("app:scope-changed", syncScope);
    return () => window.removeEventListener("app:scope-changed", syncScope);
  }, [themeConfig, skinId, skins, adminManualSkinPick]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: "light",
      skinId,
      skins,
      switchableSkins,
      pickerSkins,
      setSkinId: (id: string) => {
        if (!inAdminScope) return;
        const allowed = skins.some((skin) => skin.id === id);
        if (!allowed) return;
        setSkinIdState(id);
        setAdminManualSkinPick(true);
        if (typeof window !== "undefined") {
          localStorage.setItem(SKIN_STORAGE_KEY, id);
          localStorage.setItem(SKIN_MANUAL_KEY, "1");
        }
      },
      themeConfig,
      themeReady,
      themeSynced,
    }),
    [skinId, skins, switchableSkins, pickerSkins, inAdminScope, themeConfig, themeReady, themeSynced],
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
  const inAdmin = isAdminScope();
  if (!inAdmin) {
    localStorage.removeItem(SKIN_MANUAL_KEY);
  }
  const saved = inAdmin
    ? localStorage.getItem(SKIN_STORAGE_KEY) || localStorage.getItem(LAST_ACTIVE_SKIN_KEY) || ""
    : DEFAULT_SKIN_ID;
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

export function ThemeRuntimeOverrideProvider({
  config,
  children,
}: {
  config: ThemeConfig;
  children: ReactNode;
}) {
  const parent = useThemeRuntime();
  const previewConfig = useMemo(() => normalizeThemeConfig(config), [config]);

  const value = useMemo(
    () => ({
      ...parent,
      themeConfig: previewConfig,
      skinId: `preview-${parent.skinId}`,
      setSkinId: () => {},
      themeReady: true,
      themeSynced: true,
    }),
    [parent, previewConfig],
  );

  return <ThemeRuntimeContext.Provider value={value}>{children}</ThemeRuntimeContext.Provider>;
}

export function useThemeRuntime() {
  const context = useContext(ThemeRuntimeContext);
  if (!context) throw new Error("useThemeRuntime must be used within ThemeRuntimeProvider");
  return context;
}
