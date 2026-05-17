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

/** ??? / premium?deal ????????????? + ?? CTA */
function buildInvitePromoSurface(colors: {
  secondary: RGB;
  price: RGB;
  surface: RGB;
  primary: RGB;
  danger: RGB;
}): GradientSurfaceTokens & { bg: string; border: string; ctaBg: string; ctaFg: string } {
  const rose = colors.danger;
  const start = mixColors(rose, WHITE, 0.84);
  const end = mixColors(rose, mixColors(colors.price, colors.secondary, 0.45), 0.28);
  const surface = paletteForGradientSurface(start, end, 0.45);
  const ctaEnd = mixColors(colors.primary, BLACK, 0.88);
  const cta = paletteForGradientSurface(colors.primary, ctaEnd, 0.5);
  return {
    ...surface,
    bg: `linear-gradient(110deg, ${rgbToCss(start)}, ${rgbToCss(end)})`,
    border: rgbToCss(mixColors(rose, parseColor(surface.midCss), 0.32)),
    ctaBg: `linear-gradient(135deg, ${rgbToCss(colors.primary)}, ${rgbToCss(ctaEnd)})`,
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

export function generateThemePalette(adminConfig: ThemeConfig) {
  const bg = parseColor(adminConfig.bgColor, WHITE);
  const surface = parseColor(adminConfig.surfaceColor, bg);
  const primary = parseColor(adminConfig.primaryColor, BLACK);
  const secondary = parseColor(adminConfig.secondaryColor, primary);
  const accent = parseColor(adminConfig.accentColor, secondary);
  const price = parseColor(adminConfig.priceColor, { r: 220, g: 38, b: 38 });
  const success = parseColor(adminConfig.successColor, { r: 47, g: 133, b: 90 });
  const warning = parseColor(adminConfig.warningColor, { r: 217, g: 119, b: 6 });
  const danger = parseColor(adminConfig.dangerColor, price);
  const isDarkBg = isDarkColor(bg);
  const border =
    adminConfig.borderColor && adminConfig.borderColor !== "auto" && adminConfig.borderColor.trim() !== ""
      ? parseColor(adminConfig.borderColor, isDarkBg ? mixColors(bg, WHITE, 0.18) : mixColors(bg, BLACK, 0.12))
      : isDarkBg
        ? mixColors(bg, WHITE, 0.18)
        : mixColors(bg, BLACK, 0.12);

  const bgCss = rgbToCss(bg);
  const surfaceCss = rgbToCss(surface);
  const primaryCss = rgbToCss(primary);
  const secondaryCss = rgbToCss(secondary);
  const priceCss = rgbToCss(price);
  const text = getReadableTextColor(bgCss, adminConfig.textColor);
  const surfaceText = getReadableTextColor(surfaceCss, text);
  const mutedText = adminConfig.mutedTextColor && adminConfig.mutedTextColor !== "auto"
    ? rgbToCss(parseColor(adminConfig.mutedTextColor))
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
  const shadows = getShadowVariables(adminConfig.shadowStyle, isDarkBg);

  const gradientSurface = paletteForGradientSurface(primary, secondary, 0.5);
  const couponAccentEnd = mixColors(
    price,
    isDarkColor(price) ? BLACK : mixColors(price, bg, isDarkBg ? 0.12 : 0.22),
    isDarkColor(price) ? 0.3 : 0.34,
  );
  const couponAccentSurface = paletteForGradientSurface(price, couponAccentEnd, 0.4);
  const couponAccentEndCss = rgbToCss(couponAccentEnd);
  const memberCardSurface = buildMemberCardSurface(adminConfig.memberCardStyle, {
    primary,
    secondary,
    price,
    success,
    bg,
    surface,
  });
  const invitePromoSurface = buildInvitePromoSurface({ secondary, price, surface, primary, danger });
  const giftBadgeSurface = buildGiftBadgeSurface(price, surface);
  const couponCardPremiumLight = buildCouponCardLightSurface("premium", { primary, secondary, danger, warning });
  const couponCardDealLight = buildCouponCardLightSurface("deal", { primary, secondary, danger, warning });

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
    "--theme-coupon-card-shell-bg": invitePromoSurface.bg,
    "--theme-coupon-card-shell-border": invitePromoSurface.border,
    "--theme-coupon-card-shell-fg": invitePromoSurface.foreground,
    "--theme-coupon-card-shell-muted": invitePromoSurface.muted,
    "--theme-coupon-card-cta-bg": invitePromoSurface.ctaBg,
    "--theme-coupon-card-cta-fg": invitePromoSurface.ctaFg,
    "--theme-coupon-card-value-pane-bg": rgbToCss(mixColors(surface, WHITE, isDarkBg ? 0.12 : 0.55)),
    "--theme-bg": bgCss,
    "--theme-surface": surfaceCss,
    "--theme-border": rgbToCss(border),
    "--theme-text": text,
    "--theme-text-on-surface": surfaceText,
    "--theme-text-muted": mutedText,
    "--theme-muted": mutedText,
    "--theme-text-muted-on-surface": surfaceMutedText,
    "--theme-text-subtle": rgbToCss(mixColors(parseColor(text), bg, 0.78)),
    "--theme-radius": adminConfig.radius,
    "--theme-button-radius": adminConfig.buttonStyle === "pill" ? "999px" : adminConfig.buttonStyle === "square" ? "8px" : adminConfig.radius,
    "--theme-card-radius": adminConfig.radius,
    "--radius": adminConfig.radius,
    "--theme-font": getFontFamily(adminConfig.fontFamily),
    "--theme-font-family": getFontFamily(adminConfig.fontFamily),
    "--font-display": getFontFamily(adminConfig.fontFamily),
    "--theme-image-ratio": adminConfig.imageRatio,
    "--theme-image-fit": adminConfig.imageFit,
    "--theme-card-align": adminConfig.cardTextAlign,
    "--theme-button-style": adminConfig.buttonStyle || "rounded",
    "--theme-nav-style": adminConfig.navStyle || "clean",
    "--theme-home-layout": adminConfig.homeLayout || "classic",
    "--theme-product-card-variant": adminConfig.productCardVariant || "standard",
    "--theme-badge-style": adminConfig.badgeStyle || "soft",
    "--theme-price-style": adminConfig.priceStyle || "normal",
    "--theme-motion-level": adminConfig.motionLevel || "soft",
    "--theme-density": adminConfig.density || "comfortable",
    "--theme-header-style": adminConfig.headerStyle || "clean",
    "--theme-banner-style": adminConfig.bannerStyle || "clean",
    "--theme-coupon-style": adminConfig.couponStyle || "ticket",
    "--theme-member-card-style": adminConfig.memberCardStyle || "light",
    "--theme-category-icon-style": adminConfig.categoryIconStyle || "circle",
    "--theme-admin-mode": adminConfig.adminThemeMode || "follow_store",
    "--theme-density-gap": adminConfig.density === "compact" ? "0.5rem" : "0.75rem",
    "--theme-density-pad": adminConfig.density === "compact" ? "0.5rem" : "0.75rem",
    "--theme-density-row": adminConfig.density === "compact" ? "2.25rem" : "2.75rem",
    ...getCardShellVariables(adminConfig.cardStyle, surfaceCss, borderCss, shadows["--theme-shadow"], shadows["--theme-shadow-hover"]),

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

export function getThemeHealthChecks(adminConfig: ThemeConfig): ThemeHealthCheck[] {
  const palette = generateThemePalette(adminConfig);
  const isDark = isDarkColor(adminConfig.bgColor);
  const inputBg = palette["--theme-surface"];
  const inputBorder = palette["--theme-border"];

  const rows: Array<Omit<ThemeHealthCheck, "status" | "ratio"> & { ratio?: number }> = [
    {
      id: "primary_button",
      label: "????????",
      foreground: palette["--theme-primary-foreground"],
      background: palette["--theme-primary"],
      minRatio: 4.5,
    },
    {
      id: "danger_button",
      label: "?????????",
      foreground: palette["--theme-danger-foreground"],
      background: palette["--theme-danger"],
      minRatio: 4.5,
    },
    {
      id: "body_on_page",
      label: "???????",
      foreground: palette["--theme-text"],
      background: palette["--theme-bg"],
      minRatio: 4.5,
    },
    {
      id: "body_on_card",
      label: "???????",
      foreground: palette["--theme-text-on-surface"],
      background: palette["--theme-surface"],
      minRatio: 4.5,
    },
    {
      id: "muted_on_page",
      label: "????????",
      foreground: palette["--theme-text-muted"],
      background: palette["--theme-bg"],
      minRatio: 3,
    },
    {
      id: "border_distinct",
      label: "??????????",
      foreground: palette["--theme-border"],
      background: palette["--theme-bg"],
      minRatio: 0.08,
    },
    {
      id: "price_on_card",
      label: "????????",
      foreground: palette["--theme-price"],
      background: palette["--theme-surface"],
      minRatio: 3,
    },
    {
      id: "gradient_hero_text",
      label: "??????????",
      foreground: palette["--theme-gradient-foreground"],
      background: palette["--theme-gradient-mid"],
      minRatio: 4.5,
    },
    {
      id: "coupon_accent_hero_text",
      label: "???????????",
      foreground: palette["--theme-coupon-accent-foreground"],
      background: palette["--theme-coupon-accent-mid"],
      minRatio: 4.5,
    },
    {
      id: "member_card_text",
      label: "????????",
      foreground: palette["--theme-member-card-foreground"],
      background: palette["--theme-member-card-mid"],
      minRatio: 4.5,
    },
    {
      id: "invite_promo_text",
      label: "?????????",
      foreground: palette["--theme-invite-promo-foreground"],
      background: palette["--theme-invite-promo-mid"],
      minRatio: 4.5,
    },
    {
      id: "table_border",
      label: "??????",
      foreground: palette["--theme-border"],
      background: palette["--theme-surface"],
      minRatio: 0.1,
    },
    {
      id: "dark_input",
      label: "???????",
      foreground: inputBorder,
      background: inputBg,
      minRatio: 0.12,
    },
    {
      id: "light_button_text",
      label: "????????",
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
          : `${row.label} ${ratio}${row.id.includes("border") ? "" : `:1`}??? ? ${minRatio}${row.id.includes("border") ? "" : ":1"}?`,
    };
  });
}
