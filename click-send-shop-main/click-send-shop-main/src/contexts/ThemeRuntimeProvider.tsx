import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { getActiveTheme } from "@/api/admin/theme";
import type { ThemeConfig } from "@/types/theme";

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

function parseToRGB(colorStr: string) {
  let r = 255;
  let g = 255;
  let b = 255;
  if (!colorStr) return { r, g, b };
  const hexMatch = colorStr.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})?$/i);
  if (hexMatch) {
    r = Number.parseInt(hexMatch[1], 16);
    g = Number.parseInt(hexMatch[2], 16);
    b = Number.parseInt(hexMatch[3], 16);
  } else {
    const rgbMatch = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    if (rgbMatch) {
      r = Number.parseInt(rgbMatch[1], 10);
      g = Number.parseInt(rgbMatch[2], 10);
      b = Number.parseInt(rgbMatch[3], 10);
    }
  }
  return { r, g, b };
}

function getBrightness(colorStr: string) {
  const { r, g, b } = parseToRGB(colorStr);
  return (r * 299 + g * 587 + b * 114) / 1000;
}

function adjustColor(colorStr: string, amount: number) {
  const { r, g, b } = parseToRGB(colorStr);
  const clamp = (val: number) => Math.min(255, Math.max(0, val));
  return `rgb(${clamp(r + amount)}, ${clamp(g + amount)}, ${clamp(b + amount)})`;
}

function getShadowVariables(style: string, isDark: boolean) {
  if (style === "flat") return { "--theme-shadow": "none", "--theme-shadow-hover": "none" };
  if (style === "brutalism") {
    const color = isDark ? "rgba(255,255,255,0.9)" : "#000000";
    return { "--theme-shadow": `4px 4px 0px ${color}`, "--theme-shadow-hover": `6px 6px 0px ${color}` };
  }
  const shadowColor = isDark ? "rgba(0,0,0,0.8)" : "rgba(0,0,0,0.06)";
  const shadowHoverColor = isDark ? "rgba(0,0,0,0.95)" : "rgba(0,0,0,0.12)";
  return {
    "--theme-shadow": `0 10px 30px -10px ${shadowColor}`,
    "--theme-shadow-hover": `0 20px 40px -10px ${shadowHoverColor}`,
  };
}

function getFontFamily(fontFamily: string) {
  switch (fontFamily) {
    case "inter": return "'Inter', sans-serif";
    case "space": return "'Space Grotesk', sans-serif";
    case "playfair": return "'Playfair Display', serif";
    case "cormorant": return "'Cormorant Garamond', serif";
    case "cinzel": return "'Cinzel', serif";
    case "outfit": return "'Outfit', sans-serif";
    case "syne": return "'Syne', sans-serif";
    case "jetbrains": return "'JetBrains Mono', monospace";
    case "fraunces": return "'Fraunces', serif";
    case "system":
    default:
      return "system-ui, -apple-system, sans-serif";
  }
}

function generateThemePalette(adminConfig: ThemeConfig, userMode: ThemeMode) {
  const currentColors = userMode === "dark" ? adminConfig.dark : adminConfig.light;
  const { primaryColor, secondaryColor, priceColor, bgColor, surfaceColor, borderColor } = currentColors;
  const isDarkBg = getBrightness(bgColor) < 128;
  const computedBorder =
    borderColor && borderColor !== "auto" && borderColor.trim() !== ""
      ? borderColor
      : isDarkBg
        ? adjustColor(bgColor, 30)
        : adjustColor(bgColor, -15);

  return {
    "--theme-primary": primaryColor,
    "--theme-primary-hover": adjustColor(primaryColor, isDarkBg ? 20 : -20),
    "--theme-secondary": secondaryColor,
    "--theme-price": priceColor,
    "--theme-gradient": `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
    "--theme-bg": bgColor,
    "--theme-surface": surfaceColor,
    "--theme-border": computedBorder,
    "--theme-text": isDarkBg ? "#FFFFFF" : "#000000",
    "--theme-text-muted": isDarkBg ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.5)",
    "--theme-radius": adminConfig.radius,
    "--theme-font": getFontFamily(adminConfig.fontFamily),
    "--theme-image-ratio": adminConfig.imageRatio,
    "--theme-card-align": adminConfig.cardTextAlign,
    ...getShadowVariables(adminConfig.shadowStyle, isDarkBg),
  } as Record<string, string>;
}

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

