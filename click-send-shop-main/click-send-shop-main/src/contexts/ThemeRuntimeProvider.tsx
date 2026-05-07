import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { getActiveTheme, getThemeSkins } from "@/api/admin/theme";
import type { ThemeConfig } from "@/types/theme";
import { generateThemePalette } from "@/utils/themeContrast";

type ThemeMode = "light" | "dark";

export type ThemeSkin = {
  id: string;
  name: string;
  config: ThemeConfig;
};

const SKIN_STORAGE_KEY = "theme_skin_id";

const DEFAULT_THEME_CONFIG: ThemeConfig = {
  radius: "8px",
  fontFamily: "inter",
  shadowStyle: "soft",
  imageRatio: "1 / 1",
  cardStyle: "bordered",
  cardTextAlign: "left",
  imageFit: "cover",
  light: {
    primaryColor: "#000000",
    secondaryColor: "#4B5563",
    priceColor: "#DC2626",
    bgColor: "#F9FAFB",
    surfaceColor: "#FFFFFF",
    borderColor: "auto",
  },
  dark: {
    primaryColor: "#FFFFFF",
    secondaryColor: "#D1D5DB",
    priceColor: "#EF4444",
    bgColor: "#0A0A0A",
    surfaceColor: "#171717",
    borderColor: "auto",
  },
};

type ThemeContextValue = {
  theme: ThemeMode;
  skinId: string;
  skins: ThemeSkin[];
  setSkinId: (id: string) => void;
  themeConfig: ThemeConfig;
};

const ThemeRuntimeContext = createContext<ThemeContextValue | null>(null);

function getInitialMode(): ThemeMode {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeRuntimeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(getInitialMode);
  const [themeConfig, setThemeConfig] = useState<ThemeConfig>(DEFAULT_THEME_CONFIG);
  const [skins, setSkins] = useState<ThemeSkin[]>([]);
  const [skinId, setSkinIdState] = useState<string>("default");

  useEffect(() => {
    // 1) Prefer v2 skin endpoint
    getThemeSkins()
      .then((res) => {
        const data = res?.data;
        const remoteSkins = Array.isArray(data?.skins) ? data.skins : null;
        const remoteDefaultId = typeof data?.defaultSkinId === "string" ? data.defaultSkinId : null;

        if (!remoteSkins || remoteSkins.length === 0) throw new Error("empty skins");

        setSkins(remoteSkins);

        const saved = typeof window !== "undefined" ? localStorage.getItem(SKIN_STORAGE_KEY) : null;
        const chosen =
          (saved && remoteSkins.some((s) => s.id === saved) ? saved : null) ||
          (remoteDefaultId && remoteSkins.some((s) => s.id === remoteDefaultId) ? remoteDefaultId : null) ||
          remoteSkins[0]?.id ||
          "default";

        setSkinIdState(chosen);
        const chosenSkin = remoteSkins.find((s) => s.id === chosen) || remoteSkins[0];
        if (chosenSkin?.config) setThemeConfig((prev) => ({ ...prev, ...chosenSkin.config }));
      })
      .catch(() => {
        // 2) Backward compatible: fallback to legacy /theme/active
        getActiveTheme()
          .then((res) => {
            if (res?.data) setThemeConfig((prev) => ({ ...prev, ...res.data }));
          })
          .catch(() => {});
      });
  }, []);

  useEffect(() => {
    // auto follow system dark/light
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setThemeState(mql.matches ? "dark" : "light");
    // set once in case initial state is out-of-sync
    onChange();
    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    }
    // fallback for older browsers
    mql.addListener(onChange);
    return () => mql.removeListener(onChange);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    // keep skin selection persisted
    if (typeof window !== "undefined") localStorage.setItem(SKIN_STORAGE_KEY, skinId);

    const palette = generateThemePalette(themeConfig, theme);
    Object.entries(palette).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
  }, [theme, themeConfig, skinId]);

  useEffect(() => {
    if (!skins.length) return;
    const active = skins.find((s) => s.id === skinId);
    if (active?.config) setThemeConfig((prev) => ({ ...prev, ...active.config }));
  }, [skinId, skins]);

  const value = useMemo<ThemeContextValue>(() => ({
    theme,
    skinId,
    skins,
    setSkinId: (id: string) => setSkinIdState(id),
    themeConfig,
  }), [theme, skinId, skins, themeConfig]);

  return <ThemeRuntimeContext.Provider value={value}>{children}</ThemeRuntimeContext.Provider>;
}

export function useThemeRuntime() {
  const ctx = useContext(ThemeRuntimeContext);
  if (!ctx) throw new Error("useThemeRuntime must be used within ThemeRuntimeProvider");
  return ctx;
}

