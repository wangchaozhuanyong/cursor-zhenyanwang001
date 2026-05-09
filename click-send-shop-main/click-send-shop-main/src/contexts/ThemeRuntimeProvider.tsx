/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { ThemeConfig } from "@/types/theme";
import { generateThemePalette } from "@/utils/themeContrast";
import { normalizeMediaUrls } from "@/utils/mediaUrl";
import { toast } from "sonner";
import { toastErrorMessage } from "@/utils/errorMessage";
import { THEME_REVISION_KEY } from "@/lib/themeRevision";

type ThemeMode = "light" | "dark";

export type ThemeSkin = {
  id: string;
  name: string;
  config: ThemeConfig;
};

const SKIN_STORAGE_KEY = "theme_skin_id";
const SKIN_MANUAL_KEY = "theme_skin_manual";

const DEFAULT_THEME_CONFIG: ThemeConfig = {
  radius: "8px",
  fontFamily: "inter",
  shadowStyle: "soft",
  imageRatio: "1 / 1",
  cardStyle: "bordered",
  cardTextAlign: "left",
  imageFit: "cover",
  primaryColor: "#000000",
  secondaryColor: "#4B5563",
  priceColor: "#DC2626",
  bgColor: "#F9FAFB",
  surfaceColor: "#FFFFFF",
  borderColor: "auto",
};

type ThemeContextValue = {
  theme: ThemeMode;
  skinId: string;
  skins: ThemeSkin[];
  setSkinId: (id: string) => void;
  themeConfig: ThemeConfig;
};

const ThemeRuntimeContext = createContext<ThemeContextValue | null>(null);

type LoadOpts = { silent?: boolean };

export function ThemeRuntimeProvider({ children }: { children: ReactNode }) {
  const [themeConfig, setThemeConfig] = useState<ThemeConfig>(DEFAULT_THEME_CONFIG);
  const [skins, setSkins] = useState<ThemeSkin[]>([]);
  const [skinId, setSkinIdState] = useState<string>("default");

  const loadTheme = useCallback(async (opts?: LoadOpts) => {
    const BASE = import.meta.env.VITE_API_BASE_URL ?? "/api";

    const readJson = async (path: string) => {
      const res = await fetch(`${BASE}${path}`, {
        cache: "no-store",
        credentials: "same-origin",
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error(`请求失败 (${res.status})`);
      const body = (await res.json()) as {
        code?: number;
        message?: string;
        data?: unknown;
        traceId?: string;
      };
      if (typeof body.code === "number" && body.code !== 0) {
        const msg = typeof body.message === "string" ? body.message : "加载失败";
        const tid = typeof body.traceId === "string" ? body.traceId : "";
        throw new Error(tid ? `${msg}（追踪ID：${tid}）` : msg);
      }
      return body;
    };

    try {
      const body = await readJson("/theme/skins");
      const raw = body.data as { defaultSkinId?: string; skins?: ThemeSkin[] } | undefined;
      if (!raw || !Array.isArray(raw.skins) || raw.skins.length === 0) throw new Error("empty skins");

      const data = normalizeMediaUrls(raw, BASE) as { defaultSkinId?: string; skins: ThemeSkin[] };
      const remoteSkins = data.skins;
      const remoteDefaultId = typeof data.defaultSkinId === "string" ? data.defaultSkinId : null;

      setSkins(remoteSkins);

      const saved = typeof window !== "undefined" ? localStorage.getItem(SKIN_STORAGE_KEY) : null;
      const isManual = typeof window !== "undefined" && localStorage.getItem(SKIN_MANUAL_KEY) === "1";
      let chosen =
        (isManual && saved && remoteSkins.some((s) => s.id === saved) ? saved : null) ||
        (remoteDefaultId && remoteSkins.some((s) => s.id === remoteDefaultId) ? remoteDefaultId : null) ||
        remoteSkins[0]?.id ||
        "default";
      if (!remoteSkins.some((s) => s.id === chosen)) chosen = remoteSkins[0].id;

      setSkinIdState(chosen);
    } catch {
      try {
        const body = await readJson("/theme/active");
        const rawCfg = body.data as Partial<ThemeConfig> | null | undefined;
        const cfg = normalizeMediaUrls(rawCfg ?? {}, BASE) as Partial<ThemeConfig>;
        const fallbackConfig = { ...DEFAULT_THEME_CONFIG, ...cfg };
        setSkins([{ id: "default", name: "默认皮肤", config: fallbackConfig }]);
        setSkinIdState("default");
      } catch (e2) {
        console.error("[ThemeRuntime]", e2);
        if (!opts?.silent) toast.error(toastErrorMessage(e2, "皮肤加载失败，请稍后重试"));
      }
    }
  }, []);

  useEffect(() => {
    void loadTheme();
  }, [loadTheme]);

  useEffect(() => {
    const onBump = () => void loadTheme({ silent: true });
    window.addEventListener("app:theme-updated", onBump);
    const onStorage = (e: StorageEvent) => {
      if (e.key === THEME_REVISION_KEY) onBump();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("app:theme-updated", onBump);
      window.removeEventListener("storage", onStorage);
    };
  }, [loadTheme]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") void loadTheme({ silent: true });
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [loadTheme]);

  useEffect(() => {
    if (!skins.length) return;
    const active = skins.find((s) => s.id === skinId);
    if (active?.config) {
      setThemeConfig({ ...DEFAULT_THEME_CONFIG, ...active.config });
    }
  }, [skinId, skins]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("dark");
    if (typeof window !== "undefined") {
      localStorage.setItem(SKIN_STORAGE_KEY, skinId);
    }

    const palette = generateThemePalette(themeConfig);
    Object.entries(palette).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
  }, [themeConfig, skinId]);

  const value = useMemo<ThemeContextValue>(() => ({
    theme: "light",
    skinId,
    skins,
    setSkinId: (id: string) => {
      setSkinIdState(id);
      if (typeof window !== "undefined") {
        localStorage.setItem(SKIN_STORAGE_KEY, id);
        localStorage.setItem(SKIN_MANUAL_KEY, "1");
      }
    },
    themeConfig,
  }), [skinId, skins, themeConfig]);

  return <ThemeRuntimeContext.Provider value={value}>{children}</ThemeRuntimeContext.Provider>;
}

export function useThemeRuntime() {
  const ctx = useContext(ThemeRuntimeContext);
  if (!ctx) throw new Error("useThemeRuntime must be used within ThemeRuntimeProvider");
  return ctx;
}
