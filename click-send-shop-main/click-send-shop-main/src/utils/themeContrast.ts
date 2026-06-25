import type { ThemeConfig } from "@/types/theme";

type RGB = { r: number; g: number; b: number };

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

function rgbToRgba({ r, g, b }: RGB, alpha: number) {
  const a = Math.min(1, Math.max(0, alpha));
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${a})`;
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
  const candidates = [0.5, 0.58, 0.65, 0.72].map((weight) => mixColors(readable, bg, weight));
  const candidate = candidates.find((c) => getContrastRatio(c, bg) >= 3.8) || mixColors(opposite, bg, 0.4);
  return rgbToCss(candidate);
}

function getFontFamily(fontFamily: string) {
  const raw = (fontFamily || "").trim();
  if (!raw) return "system-ui, -apple-system, sans-serif";
  const token = raw.toLowerCase();
  switch (token) {
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
      return "system-ui, -apple-system, sans-serif";
    default:
      return raw.includes(",") || raw.includes("'") || raw.includes("\"")
        ? raw
        : "system-ui, -apple-system, sans-serif";
  }
}

function getShadowVariables(style: string, isDark: boolean) {
  if (style === "none") return { "--theme-shadow": "none", "--theme-shadow-hover": "none" };
  if (style === "aerial" || style === "moonlight") {
    return {
      "--theme-shadow": `0 18px 44px -30px ${isDark ? "rgba(8,14,24,0.82)" : "rgba(24,59,91,0.18)"}`,
      "--theme-shadow-hover": `0 24px 56px -30px ${isDark ? "rgba(8,14,24,0.9)" : "rgba(24,59,91,0.25)"}`,
    };
  }
  if (style === "paper") {
    return {
      "--theme-shadow": "0 1px 0 rgba(31,41,24,0.05), 0 14px 28px -26px rgba(42,52,30,0.24)",
      "--theme-shadow-hover": "0 2px 0 rgba(31,41,24,0.06), 0 20px 36px -28px rgba(42,52,30,0.3)",
    };
  }
  if (style === "velvet") {
    return {
      "--theme-shadow": "0 18px 46px -34px rgba(61,42,86,0.34)",
      "--theme-shadow-hover": "0 24px 58px -34px rgba(61,42,86,0.42)",
    };
  }
  if (style === "lantern") {
    return {
      "--theme-shadow": "0 18px 44px -30px rgba(174,31,38,0.28), 0 2px 10px -8px rgba(197,154,66,0.26)",
      "--theme-shadow-hover": "0 24px 58px -32px rgba(174,31,38,0.36), 0 4px 14px -10px rgba(197,154,66,0.32)",
    };
  }
  if (style === "subtle") {
    return {
      "--theme-shadow": `0 4px 14px -8px ${isDark ? "rgba(0,0,0,0.72)" : "rgba(15,23,42,0.12)"}`,
      "--theme-shadow-hover": `0 8px 20px -10px ${isDark ? "rgba(0,0,0,0.82)" : "rgba(15,23,42,0.16)"}`,
    };
  }
  if (style === "medium") {
    return {
      "--theme-shadow": `0 10px 28px -10px ${isDark ? "rgba(0,0,0,0.82)" : "rgba(15,23,42,0.22)"}`,
      "--theme-shadow-hover": `0 16px 34px -12px ${isDark ? "rgba(0,0,0,0.92)" : "rgba(15,23,42,0.3)"}`,
    };
  }
  if (style === "glow") {
    return {
      "--theme-shadow": isDark
        ? "0 0 0 1px rgba(232,204,122,0.32), 0 0 26px rgba(232,204,122,0.18)"
        : "0 0 0 1px rgba(23,19,14,0.12), 0 14px 32px -12px rgba(23,19,14,0.24)",
      "--theme-shadow-hover": isDark
        ? "0 0 0 1px rgba(232,204,122,0.52), 0 0 34px rgba(232,204,122,0.24)"
        : "0 0 0 1px rgba(23,19,14,0.18), 0 20px 36px -12px rgba(23,19,14,0.28)",
    };
  }
  return {
    "--theme-shadow": `0 8px 24px -10px ${isDark ? "rgba(0,0,0,0.8)" : "rgba(15,23,42,0.16)"}`,
    "--theme-shadow-hover": `0 14px 30px -12px ${isDark ? "rgba(0,0,0,0.9)" : "rgba(15,23,42,0.22)"}`,
  };
}

function getCardShellVariables(
  cardStyle: ThemeConfig["cardStyle"],
  surfaceCss: string,
  borderCss: string,
  themeShadow: string,
  themeShadowHover: string,
): Record<string, string> {
  switch (cardStyle) {
    case "glassBordered":
      return {
        "--theme-card-shell-bg": `color-mix(in srgb, ${surfaceCss} 78%, transparent)`,
        "--theme-card-shell-border": `1px solid color-mix(in srgb, ${borderCss} 82%, white)`,
        "--theme-card-shell-shadow": themeShadow,
        "--theme-card-shell-shadow-hover": themeShadowHover,
      };
    case "paperLayered":
      return {
        "--theme-card-shell-bg": surfaceCss,
        "--theme-card-shell-border": `1px solid color-mix(in srgb, ${borderCss} 74%, #9a7a47)`,
        "--theme-card-shell-shadow": "0 1px 0 rgba(0,0,0,0.04), 0 14px 26px -24px rgba(50,45,32,0.28)",
        "--theme-card-shell-shadow-hover": "0 2px 0 rgba(0,0,0,0.05), 0 18px 32px -24px rgba(50,45,32,0.34)",
      };
    case "framelessFloat":
      return {
        "--theme-card-shell-bg": "transparent",
        "--theme-card-shell-border": "none",
        "--theme-card-shell-shadow": "none",
        "--theme-card-shell-shadow-hover": "0 18px 36px -30px rgba(61,42,86,0.32)",
      };
    case "silkBordered":
      return {
        "--theme-card-shell-bg": surfaceCss,
        "--theme-card-shell-border": `1px solid color-mix(in srgb, ${borderCss} 72%, #c59a42)`,
        "--theme-card-shell-shadow": "0 18px 34px -28px rgba(185,31,44,0.24)",
        "--theme-card-shell-shadow-hover": "0 22px 42px -28px rgba(185,31,44,0.32)",
      };
    case "moonHaloBordered":
      return {
        "--theme-card-shell-bg": surfaceCss,
        "--theme-card-shell-border": `1px solid color-mix(in srgb, ${borderCss} 78%, #b99952)`,
        "--theme-card-shell-shadow": "0 18px 40px -32px rgba(36,60,99,0.26)",
        "--theme-card-shell-shadow-hover": "0 24px 48px -32px rgba(36,60,99,0.32)",
      };
    case "seamless":
      return {
        "--theme-card-shell-bg": "transparent",
        "--theme-card-shell-border": "none",
        "--theme-card-shell-shadow": "none",
        "--theme-card-shell-shadow-hover": "none",
      };
    case "elevated":
      return {
        "--theme-card-shell-bg": surfaceCss,
        "--theme-card-shell-border": "none",
        "--theme-card-shell-shadow": themeShadow,
        "--theme-card-shell-shadow-hover": themeShadowHover,
      };
    case "minimal":
      return {
        "--theme-card-shell-bg": surfaceCss,
        "--theme-card-shell-border": `1px solid ${borderCss}`,
        "--theme-card-shell-shadow": "none",
        "--theme-card-shell-shadow-hover": "none",
      };
    default:
      return {
        "--theme-card-shell-bg": surfaceCss,
        "--theme-card-shell-border": `1px solid ${borderCss}`,
        "--theme-card-shell-shadow": themeShadow,
        "--theme-card-shell-shadow-hover": themeShadowHover,
      };
  }
}

function ensureReadableForeground(background: RGB | string, preferred?: string, minRatio = 4.5): string {
  const bg = typeof background === "string" ? parseColor(background) : background;
  let fg = getReadableTextColor(bg, preferred, minRatio);
  if (getContrastRatio(bg, fg) < minRatio) {
    fg =
      getContrastRatio(bg, WHITE) >= getContrastRatio(bg, BLACK)
        ? rgbToCss(WHITE)
        : rgbToCss(BLACK);
  }
  return fg;
}

type GradientSurfaceTokens = {
  midCss: string;
  foreground: string;
  muted: string;
  subtle: string;
  icon: string;
  iconWrap: string;
};

/** ??/??????????????????????? price/primary */
function paletteForGradientSurface(start: RGB, end: RGB, midWeight = 0.42): GradientSurfaceTokens {
  const mid = mixColors(start, end, midWeight);
  const fg = ensureReadableForeground(mid);
  const fgRgb = parseColor(fg);
  const darkMid = isDarkColor(mid);
  /** ?????????????? + ?????????? */
  const iconWrapBg = darkMid ? mixColors(WHITE, mid, 0.94) : mixColors(WHITE, mid, 0.9);
  const brandTone = mixColors(start, end, 0.42);
  const iconFg = ensureReadableForeground(iconWrapBg, rgbToCss(brandTone), 3.2);
  return {
    midCss: rgbToCss(mid),
    foreground: fg,
    muted: getMutedTextColor(mid, fg),
    subtle: rgbToCss(mixColors(fgRgb, mid, 0.55)),
    icon: iconFg,
    iconWrap: rgbToCss(iconWrapBg),
  };
}

function buildMemberCardSurface(
  style: ThemeConfig["memberCardStyle"],
  colors: { primary: RGB; secondary: RGB; price: RGB; success: RGB; bg: RGB; surface: RGB },
): GradientSurfaceTokens & { bg: string; badgeBg: string; badgeFg: string; avatarRing: string; sheen: string } {
  let start: RGB;
  let end: RGB;
  switch (style) {
    case "gold":
      start = mixColors(colors.price, colors.surface, 0.22);
      end = mixColors(colors.price, colors.bg, 0.52);
      break;
    case "blackGold":
      start = mixColors(colors.primary, BLACK, 0.9);
      end = mixColors(colors.price, colors.primary, 0.38);
      break;
    case "fresh":
      start = mixColors(colors.success, colors.surface, 0.18);
      end = mixColors(colors.success, colors.bg, 0.42);
      break;
    case "light":
    default:
      start = mixColors(colors.primary, BLACK, 0.9);
      end = mixColors(colors.primary, colors.secondary, 0.32);
      break;
  }
  const surface = paletteForGradientSurface(start, end, 0.42);
  const mid = parseColor(surface.midCss);
  return {
    ...surface,
    bg: `linear-gradient(110deg, ${rgbToCss(start)}, ${rgbToCss(end)})`,
    badgeBg: rgbToCss(mixColors(WHITE, mid, 0.82)),
    badgeFg: ensureReadableForeground(mixColors(WHITE, mid, 0.82)),
    avatarRing: rgbToCss(mixColors(colors.price, parseColor(surface.foreground), 0.42)),
    sheen: `linear-gradient(90deg, transparent, color-mix(in srgb, ${surface.foreground} 16%, transparent))`,
  };
}

/** 优惠券活动壳：局部红金（danger/price/warning），与邀请推广条解耦 */
function buildCouponCampaignSurface(colors: {
  danger: RGB;
  price: RGB;
  warning: RGB;
  surface: RGB;
  isDarkBg: boolean;
}): GradientSurfaceTokens & {
  bg: string;
  border: string;
  ctaBg: string;
  ctaFg: string;
  valuePaneBg: string;
  divider: string;
} {
  const start = mixColors(colors.danger, WHITE, colors.isDarkBg ? 0.72 : 0.84);
  const end = mixColors(
    colors.warning,
    mixColors(colors.price, colors.danger, 0.38),
    colors.isDarkBg ? 0.42 : 0.28,
  );
  const surface = paletteForGradientSurface(start, end, 0.45);
  const mid = parseColor(surface.midCss);
  const ctaEnd = mixColors(colors.price, BLACK, colors.isDarkBg ? 0.72 : 0.82);
  const cta = paletteForGradientSurface(colors.price, ctaEnd, 0.48);
  const borderRgb = mixColors(colors.danger, mid, colors.isDarkBg ? 0.38 : 0.3);
  const valuePaneBg = mixColors(colors.surface, WHITE, colors.isDarkBg ? 0.12 : 0.55);
  return {
    ...surface,
    bg: `linear-gradient(110deg, ${rgbToCss(start)}, ${rgbToCss(end)})`,
    border: rgbToCss(borderRgb),
    ctaBg: `linear-gradient(135deg, ${rgbToCss(colors.price)}, ${rgbToCss(ctaEnd)})`,
    ctaFg: cta.foreground,
    valuePaneBg: rgbToCss(valuePaneBg),
    divider: rgbToCss(mixColors(borderRgb, colors.surface, colors.isDarkBg ? 0.35 : 0.5)),
  };
}

/** 邀请好友推广条：香槟金 / 品牌金 / 深棕金，不用 danger 促销红 */
function buildInvitePromoSurface(colors: {
  secondary: RGB;
  price: RGB;
  surface: RGB;
  primary: RGB;
  isDarkBg: boolean;
}): GradientSurfaceTokens & { bg: string; border: string; ctaBg: string; ctaFg: string } {
  const champagne = mixColors(colors.secondary, colors.price, 0.28);
  const start = mixColors(champagne, WHITE, colors.isDarkBg ? 0.68 : 0.86);
  const end = mixColors(
    colors.price,
    mixColors(colors.primary, colors.secondary, 0.35),
    colors.isDarkBg ? 0.48 : 0.32,
  );
  const surface = paletteForGradientSurface(start, end, 0.44);
  const mid = parseColor(surface.midCss);
  const ctaEnd = mixColors(colors.price, mixColors(colors.primary, BLACK, 0.88), 0.55);
  const cta = paletteForGradientSurface(colors.price, ctaEnd, 0.5);
  return {
    ...surface,
    bg: `linear-gradient(110deg, ${rgbToCss(start)}, ${rgbToCss(end)})`,
    border: rgbToCss(mixColors(colors.price, mid, colors.isDarkBg ? 0.28 : 0.22)),
    ctaBg: `linear-gradient(135deg, ${rgbToCss(colors.price)}, ${rgbToCss(ctaEnd)})`,
    ctaFg: cta.foreground,
  };
}

function buildGiftBadgeSurface(price: RGB, surface: RGB): GradientSurfaceTokens & { bg: string; ring: string } {
  const start = mixColors(price, WHITE, 0.86);
  const end = mixColors(price, surface, 0.62);
  const tokens = paletteForGradientSurface(start, end, 0.48);
  return {
    ...tokens,
    bg: `linear-gradient(155deg, ${rgbToCss(mixColors(price, WHITE, 0.92))}, ${rgbToCss(start)}, ${rgbToCss(end)})`,
    ring: rgbToCss(mixColors(price, parseColor(tokens.foreground), 0.38)),
  };
}

function buildStoreRadiusTokens(radius: string): Record<string, string> {
  const base = radius.trim() || "12px";
  return {
    "--store-card-radius": `max(8px, min(16px, ${base}))`,
    "--store-panel-radius": `max(12px, min(20px, calc(${base} + 4px)))`,
  };
}

function buildCouponCardLightSurface(
  variant: "premium" | "deal",
  colors: { primary: RGB; secondary: RGB; danger: RGB; warning: RGB },
): { fg: string; muted: string; midCss: string } {
  const start =
    variant === "deal"
      ? mixColors(colors.danger, WHITE, 0.82)
      : mixColors(colors.secondary, WHITE, 0.78);
  const end =
    variant === "deal"
      ? mixColors(colors.warning, WHITE, 0.84)
      : mixColors(colors.primary, WHITE, 0.9);
  const surface = paletteForGradientSurface(start, end, 0.5);
  return { fg: surface.foreground, muted: surface.muted, midCss: surface.midCss };
}

function buildStorefrontSurface(colors: {
  bg: RGB;
  surface: RGB;
  primary: RGB;
  secondary: RGB;
  price: RGB;
  text: RGB;
  radius: string;
  isDarkBg: boolean;
}): Record<string, string> {
  const { bg, surface, primary, secondary, price, text, radius, isDarkBg } = colors;
  const canvas = isDarkBg
    ? mixColors(bg, BLACK, 0.14)
    : mixColors(mixColors(bg, WHITE, 0.72), primary, 0.025);
  const canvasTint = isDarkBg
    ? mixColors(canvas, secondary, 0.1)
    : mixColors(mixColors(canvas, WHITE, 0.42), secondary, 0.035);
  const surfaceBase = isDarkBg
    ? mixColors(bg, WHITE, 0.08)
    : mixColors(surface, WHITE, 0.72);
  const surfaceRaised = isDarkBg
    ? mixColors(surfaceBase, WHITE, 0.06)
    : mixColors(surfaceBase, WHITE, 0.52);
  const cardBg = isDarkBg
    ? mixColors(surfaceBase, WHITE, 0.04)
    : mixColors(surfaceRaised, canvas, 0.1);
  const border = isDarkBg
    ? mixColors(surfaceBase, WHITE, 0.16)
    : mixColors(mixColors(canvas, BLACK, 0.1), primary, 0.055);
  const borderStrong = isDarkBg
    ? mixColors(surfaceBase, WHITE, 0.24)
    : mixColors(mixColors(canvas, BLACK, 0.16), primary, 0.08);
  const cardShadowTone = isDarkBg ? BLACK : mixColors(primary, BLACK, 0.82);
  const brandShadowTone = isDarkBg ? primary : mixColors(primary, BLACK, 0.62);
  const surfaceText = getReadableTextColor(surfaceRaised, rgbToCss(text));
  const muted = getMutedTextColor(surfaceRaised, surfaceText);
  const iconBg = isDarkBg
    ? mixColors(primary, surfaceRaised, 0.78)
    : mixColors(primary, surfaceRaised, 0.88);
  const mediaBg = isDarkBg
    ? mixColors(canvas, surfaceRaised, 0.36)
    : mixColors(canvas, surfaceRaised, 0.58);

  return {
    "--store-page-base": rgbToCss(canvas),
    "--store-page-tint": rgbToCss(canvasTint),
    "--store-page-top": rgbToCss(mixColors(canvasTint, surfaceRaised, isDarkBg ? 0.16 : 0.36)),
    "--store-page-sheen": rgbToRgba(mixColors(primary, WHITE, isDarkBg ? 0.18 : 0.84), isDarkBg ? 0.08 : 0.34),
    "--store-surface": rgbToCss(surfaceBase),
    "--store-surface-raised": rgbToCss(surfaceRaised),
    "--store-card-bg": rgbToCss(cardBg),
    "--store-card-border": rgbToCss(border),
    "--store-border": rgbToCss(border),
    "--store-border-strong": rgbToCss(borderStrong),
    "--store-text": surfaceText,
    "--store-muted": muted,
    ...buildStoreRadiusTokens(radius),
    "--store-card-shadow": `0 18px 42px -30px ${rgbToRgba(cardShadowTone, isDarkBg ? 0.72 : 0.28)}, 0 2px 12px -10px ${rgbToRgba(brandShadowTone, isDarkBg ? 0.42 : 0.18)}`,
    "--store-card-shadow-hover": `0 24px 54px -30px ${rgbToRgba(cardShadowTone, isDarkBg ? 0.84 : 0.34)}, 0 8px 18px -14px ${rgbToRgba(brandShadowTone, isDarkBg ? 0.52 : 0.22)}`,
    "--store-soft-shadow": `0 12px 30px -24px ${rgbToRgba(cardShadowTone, isDarkBg ? 0.7 : 0.24)}`,
    "--store-header-bg": rgbToRgba(surfaceRaised, isDarkBg ? 0.84 : 0.82),
    "--store-header-border": rgbToRgba(borderStrong, isDarkBg ? 0.64 : 0.72),
    "--store-header-shadow": `0 10px 30px -26px ${rgbToRgba(cardShadowTone, isDarkBg ? 0.72 : 0.22)}`,
    "--sf-bottom-nav-bg": rgbToRgba(surfaceRaised, isDarkBg ? 0.9 : 0.88),
    "--sf-bottom-nav-border": rgbToRgba(borderStrong, isDarkBg ? 0.68 : 0.76),
    "--store-icon-bg": rgbToCss(iconBg),
    "--store-icon-border": rgbToRgba(primary, isDarkBg ? 0.28 : 0.16),
    "--sf-product-media-bg": rgbToCss(mediaBg),
    "--sf-next-banner-border": rgbToRgba(borderStrong, isDarkBg ? 0.65 : 0.7),
    "--sf-next-banner-shadow": `0 24px 60px -36px ${rgbToRgba(cardShadowTone, isDarkBg ? 0.8 : 0.3)}`,
    "--sf-next-banner-text-surface": rgbToRgba(surfaceRaised, isDarkBg ? 0.88 : 0.92),
    "--store-skeleton-a": rgbToCss(mixColors(mediaBg, surfaceRaised, 0.42)),
    "--store-skeleton-b": rgbToCss(mixColors(mediaBg, primary, isDarkBg ? 0.16 : 0.06)),
    "--store-price-glow": rgbToRgba(price, isDarkBg ? 0.28 : 0.16),
  };
}

export function generateThemePalette(adminConfig: ThemeConfig) {
  const config = adminConfig;
  const bg = parseColor(config.bgColor, WHITE);
  const surface = parseColor(config.surfaceColor, bg);
  const primary = parseColor(config.primaryColor, BLACK);
  const secondary = parseColor(config.secondaryColor, primary);
  const accent = parseColor(config.accentColor, secondary);
  const price = parseColor(config.priceColor, { r: 220, g: 38, b: 38 });
  const success = parseColor(config.successColor, { r: 47, g: 133, b: 90 });
  const warning = parseColor(config.warningColor, { r: 217, g: 119, b: 6 });
  const danger = parseColor(config.dangerColor, price);
  const isDarkBg = isDarkColor(bg);
  const border =
    config.borderColor && config.borderColor !== "auto" && config.borderColor.trim() !== ""
      ? parseColor(config.borderColor, isDarkBg ? mixColors(bg, WHITE, 0.18) : mixColors(bg, BLACK, 0.12))
      : isDarkBg
        ? mixColors(bg, WHITE, 0.18)
        : mixColors(bg, BLACK, 0.12);

  const bgCss = rgbToCss(bg);
  const surfaceCss = rgbToCss(surface);
  const primaryCss = rgbToCss(primary);
  const secondaryCss = rgbToCss(secondary);
  const priceCss = rgbToCss(price);
  const text = getReadableTextColor(bgCss, config.textColor);
  const surfaceText = getReadableTextColor(surfaceCss, text);
  const mutedText = config.mutedTextColor && config.mutedTextColor !== "auto"
    ? rgbToCss(parseColor(config.mutedTextColor))
    : getMutedTextColor(bg, text);
  const surfaceMutedText = getMutedTextColor(surface, surfaceText);
  let primaryText = getReadableTextColor(primaryCss);
  if (getContrastRatio(primaryCss, primaryText) < 4.5) {
    primaryText =
      getContrastRatio(primaryCss, rgbToCss(WHITE)) >= getContrastRatio(primaryCss, rgbToCss(BLACK))
        ? rgbToCss(WHITE)
        : rgbToCss(BLACK);
  }
  const secondaryText = getReadableTextColor(secondaryCss);
  const accentCss = rgbToCss(accent);
  const successCss = rgbToCss(success);
  const warningCss = rgbToCss(warning);
  const dangerCss = rgbToCss(danger);
  const accentText = getReadableTextColor(accentCss);
  const successText = getReadableTextColor(successCss);
  const warningText = getReadableTextColor(warningCss);
  const dangerText = getReadableTextColor(dangerCss);
  let priceText = getReadableTextColor(priceCss);
  if (getContrastRatio(priceCss, priceText) < 4.5) {
    priceText =
      getContrastRatio(priceCss, rgbToCss(WHITE)) >= getContrastRatio(priceCss, rgbToCss(BLACK))
        ? rgbToCss(WHITE)
        : rgbToCss(BLACK);
  }
  const mutedBg = mixColors(bg, parseColor(text), isDarkBg ? 0.1 : 0.06);
  const accentBg = mixColors(bg, accent, isDarkBg ? 0.28 : 0.14);
  const borderCss = rgbToCss(border);
  const shadows = getShadowVariables(config.shadowStyle, isDarkBg);

  const gradientSurface = paletteForGradientSurface(primary, secondary, 0.5);
  const couponAccentEnd = mixColors(
    price,
    isDarkColor(price) ? BLACK : mixColors(price, bg, isDarkBg ? 0.12 : 0.22),
    isDarkColor(price) ? 0.3 : 0.34,
  );
  const couponAccentSurface = paletteForGradientSurface(price, couponAccentEnd, 0.4);
  const couponAccentEndCss = rgbToCss(couponAccentEnd);
  const memberCardSurface = buildMemberCardSurface(config.memberCardStyle, {
    primary,
    secondary,
    price,
    success,
    bg,
    surface,
  });
  const couponCampaignSurface = buildCouponCampaignSurface({ danger, price, warning, surface, isDarkBg });
  const invitePromoSurface = buildInvitePromoSurface({ secondary, price, surface, primary, isDarkBg });
  const giftBadgeSurface = buildGiftBadgeSurface(price, surface);
  const couponCardPremiumLight = buildCouponCardLightSurface("premium", { primary, secondary, danger, warning });
  const couponCardDealLight = buildCouponCardLightSurface("deal", { primary, secondary, danger, warning });
  const storefrontSurface = buildStorefrontSurface({
    bg,
    surface,
    primary,
    secondary,
    price,
    text: parseColor(text),
    radius: config.radius,
    isDarkBg,
  });
  const shadowTone = isDarkBg ? BLACK : mixColors(primary, BLACK, 0.76);
  const glassSurface = parseColor(storefrontSurface["--store-surface-raised"], surface);
  const navBorder = storefrontSurface["--store-header-border"];
  const heroOverlayStart = isDarkBg ? mixColors(bg, BLACK, 0.2) : mixColors(primary, BLACK, 0.68);
  const heroOverlayEnd = isDarkBg ? mixColors(primary, bg, 0.36) : mixColors(primary, secondary, 0.34);
  const heroBg = isDarkBg ? mixColors(bg, BLACK, 0.12) : mixColors(surface, bg, 0.28);
  const footerBg = isDarkBg ? mixColors(bg, BLACK, 0.22) : mixColors(primary, BLACK, 0.78);
  const surfaceDark = isDarkBg ? mixColors(bg, BLACK, 0.32) : mixColors(primary, BLACK, 0.82);
  const heroForeground = getReadableTextColor(heroOverlayStart, surfaceText);
  const footerForeground = getReadableTextColor(footerBg, surfaceText);
  const productShell = mixColors(bg, WHITE, 0.18);
  const productCard = mixColors(surface, WHITE, 0.5);
  const productImageBg = mixColors(bg, surface, 0.42);
  const promoBg = mixColors(price, WHITE, 0.86);
  const promoForeground = getReadableTextColor(promoBg, priceCss, 3.2);

  return {
    "--theme-primary": primaryCss,
    "--theme-primary-hover": adjustColor(primaryCss, isDarkBg ? 20 : -20),
    "--theme-primary-foreground": primaryText,
    "--theme-secondary": secondaryCss,
    "--theme-secondary-foreground": secondaryText,
    "--theme-accent": accentCss,
    "--theme-accent-foreground": accentText,
    "--theme-price": priceCss,
    "--theme-price-foreground": priceText,
    "--theme-success": successCss,
    "--theme-success-foreground": successText,
    "--theme-warning": warningCss,
    "--theme-warning-foreground": warningText,
    "--theme-danger": dangerCss,
    "--theme-danger-foreground": dangerText,
    "--theme-card": surfaceCss,
    "--theme-card-foreground": surfaceText,
    "--theme-surface-foreground": surfaceText,
    "--theme-gradient": `linear-gradient(135deg, ${primaryCss}, ${secondaryCss})`,
    "--theme-gradient-foreground": gradientSurface.foreground,
    "--theme-gradient-muted": gradientSurface.muted,
    "--theme-gradient-subtle": gradientSurface.subtle,
    "--theme-gradient-mid": gradientSurface.midCss,
    "--theme-coupon-accent-bg": `linear-gradient(to bottom right, ${priceCss}, ${couponAccentEndCss})`,
    "--theme-coupon-accent-mid": couponAccentSurface.midCss,
    "--theme-coupon-accent-foreground": couponAccentSurface.foreground,
    "--theme-coupon-accent-muted": couponAccentSurface.muted,
    "--theme-coupon-accent-subtle": couponAccentSurface.subtle,
    "--theme-coupon-accent-icon": couponAccentSurface.icon,
    "--theme-coupon-accent-icon-wrap": couponAccentSurface.iconWrap,
    "--theme-member-card-bg": memberCardSurface.bg,
    "--theme-member-card-mid": memberCardSurface.midCss,
    "--theme-member-card-foreground": memberCardSurface.foreground,
    "--theme-member-card-muted": memberCardSurface.muted,
    "--theme-member-card-subtle": memberCardSurface.subtle,
    "--theme-member-card-badge-bg": memberCardSurface.badgeBg,
    "--theme-member-card-badge-fg": memberCardSurface.badgeFg,
    "--theme-member-card-avatar-ring": memberCardSurface.avatarRing,
    "--theme-member-card-sheen": memberCardSurface.sheen,
    "--theme-invite-promo-bg": invitePromoSurface.bg,
    "--theme-invite-promo-mid": invitePromoSurface.midCss,
    "--theme-invite-promo-border": invitePromoSurface.border,
    "--theme-invite-promo-foreground": invitePromoSurface.foreground,
    "--theme-invite-promo-muted": invitePromoSurface.muted,
    "--theme-invite-promo-cta-bg": invitePromoSurface.ctaBg,
    "--theme-invite-promo-cta-fg": invitePromoSurface.ctaFg,
    "--theme-gift-badge-bg": giftBadgeSurface.bg,
    "--theme-gift-badge-ring": giftBadgeSurface.ring,
    "--theme-gift-badge-foreground": giftBadgeSurface.foreground,
    "--theme-coupon-card-premium-fg": couponCardPremiumLight.fg,
    "--theme-coupon-card-premium-muted": couponCardPremiumLight.muted,
    "--theme-coupon-card-deal-fg": couponCardDealLight.fg,
    "--theme-coupon-card-deal-muted": couponCardDealLight.muted,
    "--theme-coupon-card-shell-bg": couponCampaignSurface.bg,
    "--theme-coupon-card-shell-border": couponCampaignSurface.border,
    "--theme-coupon-card-shell-fg": couponCampaignSurface.foreground,
    "--theme-coupon-card-shell-muted": couponCampaignSurface.muted,
    "--theme-coupon-card-cta-bg": couponCampaignSurface.ctaBg,
    "--theme-coupon-card-cta-fg": couponCampaignSurface.ctaFg,
    "--theme-coupon-card-value-pane-bg": couponCampaignSurface.valuePaneBg,
    "--theme-coupon-card-divider": couponCampaignSurface.divider,
    "--theme-bg": bgCss,
    "--theme-surface": surfaceCss,
    "--theme-border": rgbToCss(border),
    "--theme-text": text,
    "--theme-text-on-surface": surfaceText,
    "--theme-text-muted": mutedText,
    "--theme-muted": mutedText,
    "--theme-text-muted-on-surface": surfaceMutedText,
    "--theme-text-subtle": rgbToCss(mixColors(parseColor(text), bg, 0.78)),
    "--theme-radius": config.radius,
    "--theme-button-radius": config.buttonStyle === "pill" || config.buttonStyle === "capsule" ? "999px" : config.buttonStyle === "square" ? "8px" : config.radius,
    "--theme-card-radius": config.radius,
    "--radius": config.radius,
    "--theme-font": getFontFamily(config.fontFamily),
    "--theme-font-family": getFontFamily(config.fontFamily),
    "--font-display": getFontFamily(config.fontFamily),
    "--theme-image-ratio": config.imageRatio,
    "--theme-image-fit": config.imageFit,
    "--theme-card-align": config.cardTextAlign,
    "--theme-button-style": config.buttonStyle || "rounded",
    "--theme-nav-style": config.navStyle || "clean",
    "--theme-home-layout": config.homeLayout || "classic",
    "--theme-product-card-variant": config.productCardVariant || "standard",
    "--theme-badge-style": config.badgeStyle || "soft",
    "--theme-price-style": config.priceStyle || "normal",
    "--theme-motion-level": config.motionLevel || "soft",
    "--theme-density": config.density || "comfortable",
    "--theme-header-style": config.headerStyle || "clean",
    "--theme-banner-style": config.bannerStyle || "clean",
    "--theme-coupon-style": config.couponStyle || "ticket",
    "--theme-member-card-style": config.memberCardStyle || "light",
    "--theme-category-icon-style": config.categoryIconStyle || "circle",
    "--theme-admin-mode": config.adminThemeMode || "fixed",
    "--theme-texture-material": config.texture.material,
    "--theme-texture-surface": config.texture.surface,
    "--theme-texture-grain": config.texture.grain,
    "--theme-texture-pattern": config.texture.pattern,
    "--theme-texture-line": config.texture.line,
    "--theme-texture-shadow": config.texture.shadow,
    "--theme-texture-temperature": config.texture.temperature,
    "--theme-grain-opacity": String(config.texture.grainOpacity),
    "--theme-pattern-opacity": String(config.texture.patternOpacity),
    "--theme-highlight-opacity": String(config.texture.highlightOpacity),
    "--theme-image-filter": `contrast(${config.texture.imageContrast}) saturate(${config.texture.imageSaturation})`,
    "--theme-density-gap": config.density === "compact" ? "0.5rem" : config.density === "airy" ? "1rem" : "0.75rem",
    "--theme-density-pad": config.density === "compact" ? "0.5rem" : config.density === "airy" ? "1rem" : "0.75rem",
    "--theme-density-row": config.density === "compact" ? "2.25rem" : config.density === "airy" ? "3rem" : "2.75rem",
    "--mall-bg": bgCss,
    "--mall-surface": surfaceCss,
    "--mall-primary": primaryCss,
    "--mall-secondary": secondaryCss,
    "--mall-accent": accentCss,
    "--mall-price": priceCss,
    "--mall-border": borderCss,
    "--mall-text": text,
    "--mall-muted": mutedText,
    "--mall-success": successCss,
    "--mall-warning": warningCss,
    "--mall-danger": dangerCss,
    "--mall-radius": config.radius,
    "--mall-grain-opacity": String(config.texture.grainOpacity),
    "--mall-pattern-opacity": String(config.texture.patternOpacity),
    "--mall-highlight-opacity": String(config.texture.highlightOpacity),
    ...getCardShellVariables(config.cardStyle, surfaceCss, borderCss, shadows["--theme-shadow"], shadows["--theme-shadow-hover"]),
    ...storefrontSurface,
    "--shadow-color": rgbToRgba(shadowTone, isDarkBg ? 0.7 : 0.26),
    "--glass-bg": rgbToRgba(glassSurface, isDarkBg ? 0.72 : 0.8),
    "--glass-border": navBorder,
    "--overlay-color": rgbToCss(heroOverlayStart),
    "--gradient-start": rgbToCss(heroOverlayStart),
    "--gradient-end": rgbToCss(heroOverlayEnd),
    "--highlight-color": rgbToRgba(isDarkBg ? WHITE : mixColors(WHITE, surface, 0.22), isDarkBg ? 0.16 : 0.72),
    "--surface-dark": rgbToCss(surfaceDark),
    "--nav-bg": storefrontSurface["--store-header-bg"],
    "--nav-foreground": surfaceText,
    "--nav-border": navBorder,
    "--hero-bg": rgbToCss(heroBg),
    "--hero-foreground": heroForeground,
    "--hero-overlay-start": rgbToCss(heroOverlayStart),
    "--hero-overlay-end": rgbToCss(heroOverlayEnd),
    "--hero-accent": accentCss,
    "--section-bg": storefrontSurface["--store-page-base"],
    "--section-bg-alt": storefrontSurface["--store-page-tint"],
    "--footer-bg": rgbToCss(footerBg),
    "--footer-foreground": footerForeground,
    "--cta-bg": priceCss,
    "--cta-foreground": priceText,
    "--button-primary": primaryCss,
    "--button-primary-foreground": primaryText,
    "--button-secondary": secondaryCss,
    "--button-secondary-foreground": secondaryText,
    "--product-shell": rgbToHslChannels(productShell),
    "--product-card": rgbToHslChannels(productCard),
    "--product-border": rgbToHslChannels(border),
    "--product-image-bg": rgbToHslChannels(productImageBg),
    "--promo-bg": rgbToHslChannels(promoBg),
    "--promo-foreground": rgbToHslChannels(parseColor(promoForeground)),
    "--price": rgbToHslChannels(price),
    "--success": rgbToHslChannels(success),
    "--warning": rgbToHslChannels(warning),
    "--danger": rgbToHslChannels(danger),

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
    ...shadows,
  } as Record<string, string>;
}

export function getThemeReadabilityReport(adminConfig: ThemeConfig) {
  const health = getThemeHealthChecks(adminConfig);
  return {
    palette: generateThemePalette(adminConfig),
    checks: health.map((item) => ({
      label: item.label,
      foreground: item.foreground,
      background: item.background,
      min: item.minRatio,
      ratio: item.ratio,
    })),
    pass: health.every((item) => item.status === "pass"),
  };
}

export type ThemeHealthStatus = "pass" | "warn" | "fail";

export type ThemeHealthCheck = {
  id: string;
  label: string;
  foreground: string;
  background: string;
  ratio: number;
  minRatio: number;
  status: ThemeHealthStatus;
  message?: string;
};

function healthStatus(ratio: number, min: number, warnGap = 0.35): ThemeHealthStatus {
  if (ratio >= min) return "pass";
  if (ratio >= min - warnGap) return "warn";
  return "fail";
}

function borderDistinctRatio(border: string, bg: string) {
  const b = parseColor(border);
  const background = parseColor(bg);
  const delta =
    Math.abs(b.r - background.r) + Math.abs(b.g - background.g) + Math.abs(b.b - background.b);
  return delta / 765;
}

function formatThemeHealthMessage(
  checkId: string,
  label: string,
  ratio: number,
  minRatio: number,
): string {
  if (checkId.includes("border")) {
    return `${label} 当前 ${ratio}，建议 ≥ ${minRatio}`;
  }
  return `${label} 当前 ${ratio}:1，建议 ≥ ${minRatio}:1`;
}

export function getThemeHealthChecks(adminConfig: ThemeConfig): ThemeHealthCheck[] {
  const palette = generateThemePalette(adminConfig);
  const isDark = isDarkColor(adminConfig.bgColor);
  const inputBg = palette["--theme-surface"];
  const inputBorder = palette["--theme-border"];

  const rows: Array<Omit<ThemeHealthCheck, "status" | "ratio"> & { ratio?: number }> = [
    {
      id: "primary_button",
      label: "主按钮文字对比",
      foreground: palette["--theme-primary-foreground"],
      background: palette["--theme-primary"],
      minRatio: 4.5,
    },
    {
      id: "danger_button",
      label: "危险按钮文字对比",
      foreground: palette["--theme-danger-foreground"],
      background: palette["--theme-danger"],
      minRatio: 4.5,
    },
    {
      id: "body_on_page",
      label: "正文文字/页面背景",
      foreground: palette["--theme-text"],
      background: palette["--theme-bg"],
      minRatio: 4.5,
    },
    {
      id: "body_on_card",
      label: "正文文字/卡片背景",
      foreground: palette["--theme-text-on-surface"],
      background: palette["--theme-surface"],
      minRatio: 4.5,
    },
    {
      id: "muted_on_page",
      label: "次要文字/页面背景",
      foreground: palette["--theme-text-muted"],
      background: palette["--theme-bg"],
      minRatio: 3,
    },
    {
      id: "border_distinct",
      label: "边框/背景区分度",
      foreground: palette["--theme-border"],
      background: palette["--theme-bg"],
      minRatio: 0.08,
    },
    {
      id: "price_on_card",
      label: "价格文字/卡片背景",
      foreground: palette["--theme-price"],
      background: palette["--theme-surface"],
      minRatio: 3,
    },
    {
      id: "gradient_hero_text",
      label: "渐变标题文字对比",
      foreground: palette["--theme-gradient-foreground"],
      background: palette["--theme-gradient-mid"],
      minRatio: 4.5,
    },
    {
      id: "coupon_accent_hero_text",
      label: "券卡强调标题文字对比",
      foreground: palette["--theme-coupon-accent-foreground"],
      background: palette["--theme-coupon-accent-mid"],
      minRatio: 4.5,
    },
    {
      id: "member_card_text",
      label: "会员卡文字对比",
      foreground: palette["--theme-member-card-foreground"],
      background: palette["--theme-member-card-mid"],
      minRatio: 4.5,
    },
    {
      id: "invite_promo_text",
      label: "邀请推广文字对比",
      foreground: palette["--theme-invite-promo-foreground"],
      background: palette["--theme-invite-promo-mid"],
      minRatio: 4.5,
    },
    {
      id: "table_border",
      label: "表格边框清晰度",
      foreground: palette["--theme-border"],
      background: palette["--theme-surface"],
      minRatio: 0.1,
    },
    {
      id: "dark_input",
      label: "输入框边框清晰度",
      foreground: inputBorder,
      background: inputBg,
      minRatio: 0.12,
    },
    {
      id: "light_button_text",
      label: "按钮文字对比",
      foreground: palette["--theme-primary-foreground"],
      background: palette["--theme-primary"],
      minRatio: 4.5,
    },
  ];

  return rows.map((row) => {
    let ratio: number;
    if (row.id === "border_distinct" || row.id === "table_border") {
      ratio = Number(borderDistinctRatio(row.foreground, row.background).toFixed(2));
    } else if (row.id === "dark_input" && !isDark) {
      ratio = 1;
    } else if (row.id === "light_button_text" && isDark) {
      ratio = Number(getContrastRatio(row.foreground, row.background).toFixed(2));
    } else {
      ratio = Number(getContrastRatio(row.foreground, row.background).toFixed(2));
    }

    const minRatio = row.minRatio;
    let status: ThemeHealthStatus;
    if (row.id === "dark_input" && !isDark) {
      status = "pass";
    } else if (row.id === "light_button_text" && isDark) {
      status = "pass";
    } else if (row.id === "border_distinct" || row.id === "table_border") {
      status = ratio >= minRatio ? "pass" : ratio >= minRatio * 0.75 ? "warn" : "fail";
    } else {
      status = healthStatus(ratio, minRatio);
    }

    return {
      id: row.id,
      label: row.label,
      foreground: row.foreground,
      background: row.background,
      minRatio,
      ratio,
      status,
      message:
        status === "pass"
          ? undefined
          : formatThemeHealthMessage(row.id, row.label, ratio, minRatio),
    };
  });
}
