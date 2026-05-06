import type { ThemeConfig } from "@/types/theme";

type RGB = { r: number; g: number; b: number };
type ThemeMode = "light" | "dark";

const WHITE: RGB = { r: 255, g: 255, b: 255 };
const BLACK: RGB = { r: 0, g: 0, b: 0 };

function clamp(value: number, min = 0, max = 255) {
  return Math.min(max, Math.max(min, value));
}

function normalizeHex(hex: string) {
  const raw = hex.replace("#", "").trim();
  if (raw.length === 3) {
    return raw.split("").map((c) => c + c).join("");
  }
  if (raw.length === 6 || raw.length === 8) return raw.slice(0, 6);
  return null;
}

function hslToRgb(h: number, s: number, l: number): RGB {
  const hue = ((h % 360) + 360) % 360;
  const sat = clamp(s, 0, 100) / 100;
  const light = clamp(l, 0, 100) / 100;
  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const x = c * (1 - Math.abs((hue / 60) % 2 - 1));
  const m = light - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;

  if (hue < 60) [r, g, b] = [c, x, 0];
  else if (hue < 120) [r, g, b] = [x, c, 0];
  else if (hue < 180) [r, g, b] = [0, c, x];
  else if (hue < 240) [r, g, b] = [0, x, c];
  else if (hue < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

export function parseColor(color: string | undefined | null, fallback: RGB = WHITE): RGB {
  const value = (color || "").trim();
  if (!value || value === "auto") return fallback;

  const hex = value.match(/^#?([a-f\d]{3}|[a-f\d]{6}|[a-f\d]{8})$/i);
  if (hex) {
    const normalized = normalizeHex(hex[1]);
    if (normalized) {
      return {
        r: Number.parseInt(normalized.slice(0, 2), 16),
        g: Number.parseInt(normalized.slice(2, 4), 16),
        b: Number.parseInt(normalized.slice(4, 6), 16),
      };
    }
  }

  const rgb = value.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i);
  if (rgb) {
    return {
      r: clamp(Number.parseFloat(rgb[1])),
      g: clamp(Number.parseFloat(rgb[2])),
      b: clamp(Number.parseFloat(rgb[3])),
    };
  }

  const hsl = value.match(/hsla?\(\s*([\d.]+)[,\s]+([\d.]+)%[,\s]+([\d.]+)%/i);
  if (hsl) {
    return hslToRgb(Number.parseFloat(hsl[1]), Number.parseFloat(hsl[2]), Number.parseFloat(hsl[3]));
  }

  return fallback;
}

export function rgbToCss({ r, g, b }: RGB) {
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}

export function rgbToHslChannels({ r, g, b }: RGB) {
  const rr = r / 255;
  const gg = g / 255;
  const bb = b / 255;
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const delta = max - min;
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1));
    if (max === rr) h = 60 * (((gg - bb) / delta) % 6);
    else if (max === gg) h = 60 * ((bb - rr) / delta + 2);
    else h = 60 * ((rr - gg) / delta + 4);
  }

  return `${Math.round((h + 360) % 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function relativeLuminance(color: RGB) {
  const channel = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(color.r) + 0.7152 * channel(color.g) + 0.0722 * channel(color.b);
}

export function getContrastRatio(a: string | RGB, b: string | RGB) {
  const c1 = typeof a === "string" ? parseColor(a) : a;
  const c2 = typeof b === "string" ? parseColor(b) : b;
  const l1 = relativeLuminance(c1);
  const l2 = relativeLuminance(c2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function mixColors(a: RGB, b: RGB, weight = 0.5): RGB {
  const w = Math.min(1, Math.max(0, weight));
  return {
    r: clamp(a.r * (1 - w) + b.r * w),
    g: clamp(a.g * (1 - w) + b.g * w),
    b: clamp(a.b * (1 - w) + b.b * w),
  };
}

export function adjustColor(color: string, amount: number) {
  const rgb = parseColor(color);
  return rgbToCss({
    r: clamp(rgb.r + amount),
    g: clamp(rgb.g + amount),
    b: clamp(rgb.b + amount),
  });
}

export function isDarkColor(color: string | RGB) {
  return relativeLuminance(typeof color === "string" ? parseColor(color) : color) < 0.35;
}

export function getReadableTextColor(background: string | RGB, preferred?: string, minRatio = 4.5) {
  const bg = typeof background === "string" ? parseColor(background) : background;
  if (preferred && preferred !== "auto" && getContrastRatio(bg, preferred) >= minRatio) {
    return rgbToCss(parseColor(preferred));
  }
  return getContrastRatio(bg, WHITE) >= getContrastRatio(bg, BLACK) ? "#FFFFFF" : "#000000";
}

export function getMutedTextColor(background: string | RGB, baseText?: string) {
  const bg = typeof background === "string" ? parseColor(background) : background;
  const readable = parseColor(getReadableTextColor(bg, baseText));
  const opposite = getContrastRatio(bg, WHITE) >= getContrastRatio(bg, BLACK) ? WHITE : BLACK;
  const candidates = [0.62, 0.72, 0.82, 0.9].map((weight) => mixColors(readable, bg, weight));
  const candidate = candidates.find((c) => getContrastRatio(c, bg) >= 3) || mixColors(opposite, bg, 0.45);
  return rgbToCss(candidate);
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

function getShadowVariables(style: string, isDark: boolean) {
  if (style === "flat") return { "--theme-shadow": "none", "--theme-shadow-hover": "none" };
  if (style === "brutalism") {
    const color = isDark ? "rgba(255,255,255,0.9)" : "#000000";
    return { "--theme-shadow": `4px 4px 0px ${color}`, "--theme-shadow-hover": `6px 6px 0px ${color}` };
  }
  return {
    "--theme-shadow": `0 10px 30px -10px ${isDark ? "rgba(0,0,0,0.8)" : "rgba(0,0,0,0.06)"}`,
    "--theme-shadow-hover": `0 20px 40px -10px ${isDark ? "rgba(0,0,0,0.95)" : "rgba(0,0,0,0.12)"}`,
  };
}

export function generateThemePalette(adminConfig: ThemeConfig, userMode: ThemeMode) {
  const currentColors = userMode === "dark" ? adminConfig.dark : adminConfig.light;
  const bg = parseColor(currentColors.bgColor, userMode === "dark" ? BLACK : WHITE);
  const surface = parseColor(currentColors.surfaceColor, bg);
  const primary = parseColor(currentColors.primaryColor, userMode === "dark" ? WHITE : BLACK);
  const secondary = parseColor(currentColors.secondaryColor, primary);
  const price = parseColor(currentColors.priceColor, { r: 220, g: 38, b: 38 });
  const isDarkBg = isDarkColor(bg);
  const border =
    currentColors.borderColor && currentColors.borderColor !== "auto" && currentColors.borderColor.trim() !== ""
      ? parseColor(currentColors.borderColor, isDarkBg ? mixColors(bg, WHITE, 0.18) : mixColors(bg, BLACK, 0.12))
      : isDarkBg
        ? mixColors(bg, WHITE, 0.18)
        : mixColors(bg, BLACK, 0.12);

  const bgCss = rgbToCss(bg);
  const surfaceCss = rgbToCss(surface);
  const primaryCss = rgbToCss(primary);
  const secondaryCss = rgbToCss(secondary);
  const priceCss = rgbToCss(price);
  const text = getReadableTextColor(bgCss);
  const surfaceText = getReadableTextColor(surfaceCss, text);
  const mutedText = getMutedTextColor(bg, text);
  const surfaceMutedText = getMutedTextColor(surface, surfaceText);
  const primaryText = getReadableTextColor(primaryCss);
  const secondaryText = getReadableTextColor(secondaryCss);
  const priceText = getReadableTextColor(priceCss);
  const mutedBg = mixColors(bg, parseColor(text), isDarkBg ? 0.1 : 0.06);
  const accentBg = mixColors(bg, price, isDarkBg ? 0.28 : 0.14);

  return {
    "--theme-primary": primaryCss,
    "--theme-primary-hover": adjustColor(primaryCss, isDarkBg ? 20 : -20),
    "--theme-primary-foreground": primaryText,
    "--theme-secondary": secondaryCss,
    "--theme-secondary-foreground": secondaryText,
    "--theme-price": priceCss,
    "--theme-price-foreground": priceText,
    "--theme-gradient": `linear-gradient(135deg, ${primaryCss}, ${secondaryCss})`,
    "--theme-gradient-foreground": getReadableTextColor(mixColors(primary, secondary, 0.5)),
    "--theme-bg": bgCss,
    "--theme-surface": surfaceCss,
    "--theme-border": rgbToCss(border),
    "--theme-text": text,
    "--theme-text-on-surface": surfaceText,
    "--theme-text-muted": mutedText,
    "--theme-text-muted-on-surface": surfaceMutedText,
    "--theme-text-subtle": rgbToCss(mixColors(parseColor(text), bg, 0.78)),
    "--theme-radius": adminConfig.radius,
    "--theme-font": getFontFamily(adminConfig.fontFamily),
    "--theme-image-ratio": adminConfig.imageRatio,
    "--theme-card-align": adminConfig.cardTextAlign,

    "--background": rgbToHslChannels(bg),
    "--foreground": rgbToHslChannels(parseColor(text)),
    "--card": rgbToHslChannels(surface),
    "--card-foreground": rgbToHslChannels(parseColor(surfaceText)),
    "--popover": rgbToHslChannels(surface),
    "--popover-foreground": rgbToHslChannels(parseColor(surfaceText)),
    "--primary": rgbToHslChannels(primary),
    "--primary-foreground": rgbToHslChannels(parseColor(primaryText)),
    "--secondary": rgbToHslChannels(mutedBg),
    "--secondary-foreground": rgbToHslChannels(parseColor(surfaceText)),
    "--muted": rgbToHslChannels(mutedBg),
    "--muted-foreground": rgbToHslChannels(parseColor(mutedText)),
    "--accent": rgbToHslChannels(accentBg),
    "--accent-foreground": rgbToHslChannels(parseColor(getReadableTextColor(accentBg))),
    "--gold": rgbToHslChannels(price),
    "--gold-light": rgbToHslChannels(mixColors(price, bg, 0.78)),
    "--gold-dark": rgbToHslChannels(mixColors(price, BLACK, 0.25)),
    "--border": rgbToHslChannels(border),
    "--input": rgbToHslChannels(border),
    "--ring": rgbToHslChannels(price),
    ...getShadowVariables(adminConfig.shadowStyle, isDarkBg),
  } as Record<string, string>;
}

export function getThemeReadabilityReport(adminConfig: ThemeConfig, userMode: ThemeMode) {
  const palette = generateThemePalette(adminConfig, userMode);
  const checks = [
    { label: "页面正文", foreground: palette["--theme-text"], background: palette["--theme-bg"], min: 4.5 },
    { label: "卡片正文", foreground: palette["--theme-text-on-surface"], background: palette["--theme-surface"], min: 4.5 },
    { label: "次级文字", foreground: palette["--theme-text-muted"], background: palette["--theme-bg"], min: 3 },
    { label: "卡片次级文字", foreground: palette["--theme-text-muted-on-surface"], background: palette["--theme-surface"], min: 3 },
    { label: "主按钮文字", foreground: palette["--theme-primary-foreground"], background: palette["--theme-primary"], min: 4.5 },
    { label: "价格/强调文字", foreground: palette["--theme-price"], background: palette["--theme-bg"], min: 3 },
  ].map((item) => ({
    ...item,
    ratio: Number(getContrastRatio(item.foreground, item.background).toFixed(2)),
  }));

  return {
    palette,
    checks,
    pass: checks.every((item) => item.ratio >= item.min),
  };
}
