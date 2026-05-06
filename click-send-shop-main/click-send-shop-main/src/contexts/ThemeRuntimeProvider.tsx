import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { getActiveTheme } from "@/api/admin/theme";
import type { ThemeConfig } from "@/types/theme";
import { generateThemePalette } from "@/utils/themeContrast";

type ThemeMode = "light" | "dark";

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
  setTheme: (theme: ThemeMode) => void;
  toggle: () => void;
  themeConfig: ThemeConfig;
  setThemeConfig: (cfg: ThemeConfig) => void;
};

const ThemeRuntimeContext = createContext<ThemeContextValue | null>(null);

function getInitialMode(): ThemeMode {
  if (typeof window === "undefined") return "light";
  const saved = localStorage.getItem("theme") as ThemeMode | null;
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeRuntimeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(getInitialMode);
  const [themeConfig, setThemeConfig] = useState<ThemeConfig>(DEFAULT_THEME_CONFIG);

  useEffect(() => {
    getActiveTheme()
      .then((res) => {
        if (res?.data) {
          setThemeConfig((prev) => ({ ...prev, ...res.data }));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);

    const palette = generateThemePalette(themeConfig, theme);
    Object.entries(palette).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
  }, [theme, themeConfig]);

  const value = useMemo<ThemeContextValue>(() => ({
    theme,
    setTheme: setThemeState,
    toggle: () => setThemeState((t) => (t === "dark" ? "light" : "dark")),
    themeConfig,
    setThemeConfig,
  }), [theme, themeConfig]);

  return <ThemeRuntimeContext.Provider value={value}>{children}</ThemeRuntimeContext.Provider>;
}

export function useThemeRuntime() {
  const ctx = useContext(ThemeRuntimeContext);
  if (!ctx) throw new Error("useThemeRuntime must be used within ThemeRuntimeProvider");
  return ctx;
}

