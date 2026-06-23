import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  ADMIN_SAFE_THEME_OVERRIDES,
  DEFAULT_SKIN_ID,
  THEME_PRESETS,
} from "@/constants/themePresets";
import {
  THEME_PREVIEW_READY,
  getThemePreviewParentOrigin,
  isThemePreviewApplyMessage,
  isThemePreviewFrame,
} from "@/lib/themePreviewBridge";
import { THEME_REVISION_KEY } from "@/lib/themeRevision";
import { resolvePublicThemeFromSkin } from "@/lib/publicTheme";
import { normalizeMediaUrls } from "@/utils/mediaUrl";
import { getClientDesignStyleBySkinId } from "@/utils/clientDesignStyle";
import { generateThemePalette } from "@/utils/themeContrast";
import { normalizeThemeConfig, normalizeThemeSkinsPayload, resolveRuntimeThemeSkinId } from "@/utils/themeConfig";
import { readThemePreviewDraftToken, readThemePreviewSkinId } from "@/utils/themePreviewParams";
import type { ThemeConfig, ThemeSkin } from "@/types/theme";

type ThemeMode = "light" | "dark";

const SKINS_CACHE_KEY = "theme_cached_skins";
const STOREFRONT_NEXT_THEME_OVERRIDES: Record<string, string> = {
  "--theme-bg": "#f4f5f2",
  "--theme-surface": "#fefefc",
  "--theme-border": "#dde1dc",
  "--theme-text": "#171918",
  "--theme-text-muted": "#646a65",
  "--theme-text-on-surface": "#171918",
  "--theme-text-muted-on-surface": "#646a65",
  "--theme-primary": "#245b49",
  "--theme-primary-hover": "#1e4d3e",
  "--theme-primary-foreground": "#ffffff",
  "--theme-price": "#a44335",
  "--theme-price-foreground": "#ffffff",
  "--theme-success": "#2b6b50",
  "--theme-success-foreground": "#ffffff",
  "--theme-warning": "#96641a",
  "--theme-danger": "#a73d34",
  "--theme-radius": "1rem",
  "--theme-card-radius": "1.125rem",
  "--theme-button-radius": "0.625rem",
  "--theme-shadow": "0 1px 2px rgb(20 24 21 / 5%)",
  "--theme-shadow-hover": "0 6px 18px rgb(20 24 21 / 7%)",
  "--theme-shadow-control": "0 1px 2px rgb(20 24 21 / 5%)",
  "--theme-focus-ring": "0 0 0 3px rgb(36 91 73 / 18%)",
};

type ThemeContextValue = {
  theme: ThemeMode;
  skinId: string;
  skins: ThemeSkin[];
  switchableSkins: ThemeSkin[];
  pickerSkins: ThemeSkin[];
  setSkinId: (id: string) => void;
  themeConfig: ThemeConfig;
  themeReady: boolean;
  themeSynced: boolean;
};

const ThemeRuntimeContext = createContext<ThemeContextValue | null>(null);

function isAdminScope() {
  return typeof window !== "undefined" && window.location.pathname.startsWith("/admin");
}

function isStorefrontNextScope(root: HTMLElement, inAdmin: boolean) {
  if (inAdmin) return false;
  return root.getAttribute("data-storefront-ui") === "next" || root.getAttribute("data-app-scope") === "store";
}

function applyStorefrontNextThemeOverrides(root: HTMLElement, inAdmin: boolean) {
  if (!isStorefrontNextScope(root, inAdmin)) return;
  Object.entries(STOREFRONT_NEXT_THEME_OVERRIDES).forEach(([key, value]) => root.style.setProperty(key, value));
}

function resolveThemeConfigForScope(config: ThemeConfig, inAdmin: boolean): ThemeConfig {
  if (!inAdmin) return config;
  return normalizeThemeConfig({ ...config, ...ADMIN_SAFE_THEME_OVERRIDES });
}

function applyThemeDataAttributes(root: HTMLElement, config: ThemeConfig, skin?: ThemeSkin | null) {
  root.setAttribute("data-public-theme", resolvePublicThemeFromSkin(skin, config));
  root.setAttribute("data-admin-theme", config.adminThemeMode);
  if (skin?.id) {
    root.setAttribute("data-theme-skin-id", skin.id);
    root.setAttribute("data-theme", skin.id);
  } else {
    root.removeAttribute("data-theme-skin-id");
    root.removeAttribute("data-theme");
  }
  root.setAttribute("data-client-design-style", getClientDesignStyleBySkinId(skin?.id));
  if (skin?.category) root.setAttribute("data-theme-category", skin.category);
  else root.removeAttribute("data-theme-category");
  if (skin?.sceneTag) root.setAttribute("data-theme-scene", skin.sceneTag);
  else root.removeAttribute("data-theme-scene");
  root.setAttribute("data-theme-button-style", config.buttonStyle);
  root.setAttribute("data-theme-nav-style", config.navStyle);
  root.setAttribute("data-theme-product-card-variant", config.productCardVariant);
  root.setAttribute("data-theme-card-style", config.cardStyle);
  root.setAttribute("data-theme-card-align", config.cardTextAlign);
  root.setAttribute("data-theme-image-fit", config.imageFit);
  root.setAttribute("data-theme-image-ratio", config.imageRatio);
  root.setAttribute("data-theme-badge-style", config.badgeStyle);
  root.setAttribute("data-theme-price-style", config.priceStyle);
  root.setAttribute("data-theme-shadow-style", config.shadowStyle);
  root.setAttribute("data-theme-home-layout", config.homeLayout);
  root.setAttribute("data-home-layout", config.homeLayout);
  root.setAttribute("data-theme-header-style", config.headerStyle);
  root.setAttribute("data-header-style", config.headerStyle);
  root.setAttribute("data-theme-banner-style", config.bannerStyle);
  root.setAttribute("data-banner-style", config.bannerStyle);
  root.setAttribute("data-theme-coupon-style", config.couponStyle);
  root.setAttribute("data-theme-member-card-style", config.memberCardStyle);
  root.setAttribute("data-theme-category-icon-style", config.categoryIconStyle);
  root.setAttribute("data-theme-motion-level", config.motionLevel);
  root.setAttribute("data-theme-density", config.density);
  root.setAttribute("data-theme-admin-mode", config.adminThemeMode);
  root.setAttribute("data-product-card", config.productCardVariant);
  root.setAttribute("data-card-style", config.cardStyle);
  root.setAttribute("data-texture", config.texture.material);
  root.setAttribute("data-density", config.density);
  root.setAttribute("data-motion", config.motionLevel);
  root.setAttribute("data-festival-mode", config.festival.mode);
}

function chooseRuntimeSkin(normalized: ReturnType<typeof normalizeThemeSkinsPayload>) {
  const runtimeSkinId = normalized.runtimeSkinId || resolveRuntimeThemeSkinId(normalized);
  const fallbackId = normalized.activeSkinId || normalized.defaultSkinId || DEFAULT_SKIN_ID;
  const chosen = runtimeSkinId || fallbackId;
  return normalized.skins.some((skin) => skin.id === chosen) ? chosen : fallbackId;
}

export function ThemeRuntimeProvider({ children }: { children: ReactNode }) {
  const initial = getInitialThemeState();
  const [skins, setSkins] = useState<ThemeSkin[]>(initial.skins);
  const [skinId, setSkinIdState] = useState<string>(initial.skinId);
  const [themeConfig, setThemeConfig] = useState<ThemeConfig>(initial.themeConfig);
  const [themeReady, setThemeReady] = useState(initial.ready);
  const [themeSynced, setThemeSynced] = useState(false);
  const [inAdminScope, setInAdminScope] = useState(() => isAdminScope());
  const [urlSkinId, setUrlSkinId] = useState(() => readThemePreviewSkinId());
  const [previewOverride, setPreviewOverride] = useState<{ config: ThemeConfig; skinKey?: string } | null>(null);
  const previewFrame = useMemo(() => isThemePreviewFrame(), []);

  useEffect(() => {
    const syncScope = () => setInAdminScope(isAdminScope());
    syncScope();
    window.addEventListener("app:scope-changed", syncScope);
    return () => window.removeEventListener("app:scope-changed", syncScope);
  }, []);

  useEffect(() => {
    const syncUrlSkin = () => setUrlSkinId(readThemePreviewSkinId());
    syncUrlSkin();
    window.addEventListener("popstate", syncUrlSkin);
    window.addEventListener("app:scope-changed", syncUrlSkin);
    return () => {
      window.removeEventListener("popstate", syncUrlSkin);
      window.removeEventListener("app:scope-changed", syncUrlSkin);
    };
  }, []);

  useEffect(() => {
    if (!previewFrame) return undefined;
    const targetOrigin = getThemePreviewParentOrigin();
    const notifyReady = () => {
      window.parent?.postMessage({ type: THEME_PREVIEW_READY }, targetOrigin);
    };
    const onPreviewMessage = (event: MessageEvent) => {
      if (event.origin !== targetOrigin) return;
      if (!isThemePreviewApplyMessage(event.data)) return;
      setPreviewOverride({
        config: normalizeThemeConfig(event.data.config),
        skinKey: event.data.skinKey,
      });
      setThemeReady(true);
      setThemeSynced(true);
    };

    window.addEventListener("message", onPreviewMessage);
    notifyReady();
    const readyTimer = window.setTimeout(notifyReady, 120);
    return () => {
      window.clearTimeout(readyTimer);
      window.removeEventListener("message", onPreviewMessage);
    };
  }, [previewFrame]);

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
      const draftToken = readThemePreviewDraftToken();
      if (draftToken) {
        const draftResponse = await fetch(`${base}/theme/preview/${encodeURIComponent(draftToken)}?_=${Date.now()}`, {
          cache: "no-store",
          credentials: "same-origin",
          headers: { Accept: "application/json" },
        });
        if (draftResponse.ok) {
          const draftBody = (await draftResponse.json()) as {
            code?: number;
            data?: { themeKey?: string; name?: string; config?: ThemeConfig };
          };
          if ((draftBody.code ?? 0) === 0 && draftBody.data?.themeKey && draftBody.data.config) {
            const draftSkin: ThemeSkin = {
              id: draftBody.data.themeKey,
              themeKey: draftBody.data.themeKey,
              name: draftBody.data.name || "主题预览草稿",
              category: "预览草稿",
              sceneTag: "mall",
              type: "evergreen",
              status: "draft",
              config: normalizeThemeConfig(draftBody.data.config),
            };
            raw.skins = [draftSkin, ...(raw.skins || []).filter((skin) => skin.id !== draftSkin.id)];
            raw.activeSkinId = draftSkin.id;
            raw.runtimeSkinId = draftSkin.id;
          }
        }
      }
      const normalized = normalizeThemeSkinsPayload(raw);
      const chosen = chooseRuntimeSkin(normalized);
      const active = normalized.skins.find((skin) => skin.id === chosen) ?? normalized.skins[0];

      setSkins(normalized.skins);
      setSkinIdState(chosen);
      setThemeConfig(normalizeThemeConfig(active?.config));
      setThemeReady(true);
      setThemeSynced(true);

      if (typeof window !== "undefined") {
        localStorage.setItem(SKINS_CACHE_KEY, JSON.stringify(normalized.skins));
      }
    } catch (error) {
      const fallback = normalizeThemeSkinsPayload({
        defaultSkinId: DEFAULT_SKIN_ID,
        activeSkinId: DEFAULT_SKIN_ID,
        skins: THEME_PRESETS,
      });
      setSkins(fallback.skins);
      setSkinIdState(DEFAULT_SKIN_ID);
      setThemeConfig(normalizeThemeConfig(fallback.skins.find((skin) => skin.id === DEFAULT_SKIN_ID)?.config));
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
    const active = skins.find((skin) => skin.id === skinId) ?? skins[0];
    setThemeConfig(normalizeThemeConfig(active?.config));
  }, [skinId, skins]);

  const urlSkin = useMemo(
    () => (urlSkinId ? skins.find((skin) => skin.id === urlSkinId) ?? null : null),
    [skins, urlSkinId],
  );
  const effectiveThemeConfig = previewOverride?.config ?? urlSkin?.config ?? themeConfig;
  const effectiveSkinId = previewOverride?.skinKey ? `preview-${previewOverride.skinKey}` : urlSkin?.id ?? skinId;

  const appliedConfig = useMemo(
    () => resolveThemeConfigForScope(effectiveThemeConfig, inAdminScope),
    [effectiveThemeConfig, inAdminScope],
  );

  const appliedSkin = useMemo(() => {
    const active = skins.find((skin) => skin.id === effectiveSkinId) ?? skins.find((skin) => skin.id === skinId) ?? skins[0] ?? null;
    if (!previewOverride) return active;
    return {
      ...(active ?? {
        id: effectiveSkinId,
        name: "Theme preview draft",
        config: previewOverride.config,
      }),
      id: effectiveSkinId,
      name: active?.name ? `${active.name} · 预览草稿` : "预览草稿",
      category: active?.category ?? (inAdminScope ? "admin" : "preview"),
      sceneTag: inAdminScope ? "admin" : active?.sceneTag,
      config: previewOverride.config,
    } satisfies ThemeSkin;
  }, [effectiveSkinId, inAdminScope, previewOverride, skinId, skins]);

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.classList.remove("dark");
    root.setAttribute("data-theme-ready", themeReady ? "true" : "false");
    root.setAttribute("data-theme-synced", themeSynced ? "true" : "false");
    applyThemeDataAttributes(root, appliedConfig, appliedSkin);

    const palette = generateThemePalette(appliedConfig);
    Object.entries(palette).forEach(([key, value]) => root.style.setProperty(key, value));
    applyStorefrontNextThemeOverrides(root, inAdminScope);
  }, [appliedConfig, appliedSkin, inAdminScope, themeReady, themeSynced]);

  useLayoutEffect(() => {
    const syncScope = () => {
      const root = document.documentElement;
      const scoped = resolveThemeConfigForScope(effectiveThemeConfig, isAdminScope());
      const palette = generateThemePalette(scoped);
      Object.entries(palette).forEach(([key, value]) => root.style.setProperty(key, value));
      applyThemeDataAttributes(root, scoped, appliedSkin);
      applyStorefrontNextThemeOverrides(root, isAdminScope());
    };
    syncScope();
    window.addEventListener("app:scope-changed", syncScope);
    return () => window.removeEventListener("app:scope-changed", syncScope);
  }, [effectiveThemeConfig, appliedSkin]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: "light",
      skinId: effectiveSkinId,
      skins,
      switchableSkins: [],
      pickerSkins: [],
      setSkinId: () => {},
      themeConfig: effectiveThemeConfig,
      themeReady,
      themeSynced,
    }),
    [effectiveSkinId, skins, effectiveThemeConfig, themeReady, themeSynced],
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
  const normalized = normalizeThemeSkinsPayload({
    defaultSkinId: DEFAULT_SKIN_ID,
    activeSkinId: DEFAULT_SKIN_ID,
    skins: cachedSkins.length > 0 ? cachedSkins : THEME_PRESETS,
  });
  const sourceSkins = normalized.skins;
  const previewSkinId = readThemePreviewSkinId();
  const active = sourceSkins.find((skin) => skin.id === previewSkinId) ?? sourceSkins.find((skin) => skin.id === DEFAULT_SKIN_ID) ?? sourceSkins[0];

  return {
    skins: sourceSkins,
    skinId: active?.id ?? DEFAULT_SKIN_ID,
    themeConfig: normalizeThemeConfig(active?.config),
    ready: cachedSkins.length > 0,
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
