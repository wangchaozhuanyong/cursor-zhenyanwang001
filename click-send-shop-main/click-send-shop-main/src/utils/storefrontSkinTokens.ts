import type { ThemeConfig } from "@/types/theme";

type ThemePalette = Record<string, string>;

function readToken(palette: ThemePalette, key: string, fallback: string) {
  const value = palette[key];
  return typeof value === "string" && value.trim() ? value : fallback;
}

function mix(color: string, amount: number, base: string) {
  return `color-mix(in srgb, ${color} ${amount}%, ${base})`;
}

export function buildStorefrontNextSkinTokens(config: ThemeConfig, palette: ThemePalette): ThemePalette {
  const primary = readToken(palette, "--mall-primary", readToken(palette, "--theme-primary", config.primaryColor));
  const mallSurface = readToken(palette, "--mall-surface", readToken(palette, "--theme-surface", config.surfaceColor));
  const surface = readToken(palette, "--store-surface-raised", mallSurface);
  const canvas = readToken(palette, "--mall-bg", readToken(palette, "--store-page-base", readToken(palette, "--theme-bg", config.bgColor)));
  const tint = readToken(palette, "--store-page-tint", canvas);
  const card = readToken(palette, "--store-card-bg", surface);
  const border = readToken(palette, "--mall-border", readToken(palette, "--store-border", readToken(palette, "--theme-border", config.borderColor)));
  const borderStrong = readToken(palette, "--store-border-strong", border);
  const text = readToken(palette, "--mall-text", readToken(palette, "--store-text", readToken(palette, "--theme-text", config.textColor)));
  const muted = readToken(palette, "--mall-muted", readToken(palette, "--store-muted", readToken(palette, "--theme-text-muted", config.mutedTextColor)));
  const price = readToken(palette, "--mall-price", readToken(palette, "--theme-price", config.priceColor));
  const success = readToken(palette, "--mall-success", readToken(palette, "--theme-success", config.successColor));
  const warning = readToken(palette, "--mall-warning", readToken(palette, "--theme-warning", config.warningColor));
  const danger = readToken(palette, "--mall-danger", readToken(palette, "--theme-danger", config.dangerColor));
  const shadow = readToken(palette, "--store-card-shadow", readToken(palette, "--theme-shadow", "0 1px 2px rgb(20 24 21 / 5%)"));
  const shadowHover = readToken(palette, "--store-card-shadow-hover", readToken(palette, "--theme-shadow-hover", shadow));
  const softShadow = readToken(palette, "--store-soft-shadow", shadow);

  return {
    "--theme-bg": canvas,
    "--theme-surface": card,
    "--theme-border": border,
    "--theme-text": text,
    "--theme-text-muted": muted,
    "--theme-text-on-surface": readToken(palette, "--theme-text-on-surface", text),
    "--theme-text-muted-on-surface": readToken(palette, "--theme-text-muted-on-surface", muted),
    "--theme-primary": primary,
    "--theme-primary-hover": readToken(palette, "--theme-primary-hover", mix(primary, 88, "black")),
    "--theme-primary-foreground": readToken(palette, "--theme-primary-foreground", "#ffffff"),
    "--theme-price": price,
    "--theme-price-foreground": readToken(palette, "--theme-price-foreground", "#ffffff"),
    "--theme-success": success,
    "--theme-success-foreground": readToken(palette, "--theme-success-foreground", "#ffffff"),
    "--theme-warning": warning,
    "--theme-warning-foreground": readToken(palette, "--theme-warning-foreground", "#ffffff"),
    "--theme-danger": danger,
    "--theme-danger-foreground": readToken(palette, "--theme-danger-foreground", "#ffffff"),
    "--theme-radius": readToken(palette, "--theme-radius", config.radius),
    "--theme-card-radius": readToken(palette, "--theme-card-radius", config.radius),
    "--theme-button-radius": readToken(palette, "--theme-button-radius", config.radius),
    "--theme-shadow": shadow,
    "--theme-shadow-hover": shadowHover,
    "--theme-shadow-control": softShadow,
    "--theme-focus-ring": `0 0 0 3px ${mix(primary, 22, "transparent")}`,

    "--sf-canvas": canvas,
    "--sf-surface": surface,
    "--sf-surface-muted": mix(surface, 78, canvas),
    "--sf-surface-strong": mix(surface, 68, borderStrong),
    "--sf-ink": text,
    "--sf-ink-secondary": muted,
    "--sf-ink-quiet": mix(muted, 74, canvas),
    "--sf-line": border,
    "--sf-line-strong": borderStrong,
    "--sf-accent": primary,
    "--sf-on-accent": readToken(palette, "--theme-primary-foreground", "#ffffff"),
    "--sf-accent-soft": mix(primary, 10, surface),
    "--sf-accent-border": mix(primary, 28, border),
    "--sf-price": price,
    "--sf-success": success,
    "--sf-warning": warning,
    "--sf-danger": danger,
    "--sf-graphite": mix(text, 92, "black"),
    "--sf-graphite-muted": mix(text, 76, canvas),
    "--sf-overlay": mix(text, 48, "transparent"),
    "--sf-shadow-xs": softShadow,
    "--sf-shadow-sm": shadow,
    "--sf-shadow-dialog": shadowHover,
    "--sf-shadow-nav": readToken(palette, "--store-header-shadow", shadow),
    "--sf-texture-grain-opacity": readToken(palette, "--theme-grain-opacity", String(config.texture.grainOpacity)),
    "--sf-texture-pattern-opacity": readToken(palette, "--theme-pattern-opacity", String(config.texture.patternOpacity)),
    "--sf-image-filter": readToken(palette, "--theme-image-filter", `contrast(${config.texture.imageContrast}) saturate(${config.texture.imageSaturation})`),
    "--sf-page-top": readToken(palette, "--store-page-top", tint),
  };
}
