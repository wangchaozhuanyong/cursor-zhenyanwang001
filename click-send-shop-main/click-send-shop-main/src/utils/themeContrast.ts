import type { ThemeConfig } from "@/types/theme";

type RGB = { r: number; g: number; b: number };
const WHITE: RGB = { r: 255, g: 255, b: 255 };
const BLACK: RGB = { r: 0, g: 0, b: 0 };

function clamp(v: number, min = 0, max = 255) { return Math.min(max, Math.max(min, v)); }

export function parseColor(color: string | undefined | null, fallback: RGB = WHITE): RGB {
  const v = (color || "").trim();
  const m = v.match(/^#?([a-f\d]{6})$/i);
  if (!m) return fallback;
  return { r: parseInt(m[1].slice(0, 2), 16), g: parseInt(m[1].slice(2, 4), 16), b: parseInt(m[1].slice(4, 6), 16) };
}

export function rgbToCss({ r, g, b }: RGB) { return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`; }
export function rgbToHslChannels({ r, g, b }: RGB) { return `${Math.round((r/255)*360)} ${Math.round((g/255)*100)}% ${Math.round((b/255)*100)}%`; }

function lum(c: RGB) { const f = (x:number)=>{ const v=x/255; return v<=0.03928? v/12.92:((v+0.055)/1.055)**2.4; }; return 0.2126*f(c.r)+0.7152*f(c.g)+0.0722*f(c.b); }
export function getContrastRatio(a: string | RGB, b: string | RGB) { const c1=typeof a==='string'?parseColor(a):a; const c2=typeof b==='string'?parseColor(b):b; const l1=lum(c1), l2=lum(c2); const hi=Math.max(l1,l2), lo=Math.min(l1,l2); return (hi+0.05)/(lo+0.05); }
export function mixColors(a: RGB, b: RGB, w = 0.5): RGB { return { r: clamp(a.r*(1-w)+b.r*w), g: clamp(a.g*(1-w)+b.g*w), b: clamp(a.b*(1-w)+b.b*w) }; }
export function adjustColor(color: string, amount: number) { const c=parseColor(color); return rgbToCss({ r: clamp(c.r+amount), g: clamp(c.g+amount), b: clamp(c.b+amount) }); }
export function isDarkColor(color: string | RGB) { return lum(typeof color==='string'?parseColor(color):color) < 0.35; }
export function getReadableTextColor(background: string | RGB, preferred?: string, minRatio = 4.5) {
  const bg = typeof background === "string" ? parseColor(background) : background;
  if (preferred && preferred !== "auto" && getContrastRatio(bg, preferred) >= minRatio) return preferred;
  return getContrastRatio(bg, WHITE) >= getContrastRatio(bg, BLACK) ? "#FFFFFF" : "#000000";
}
export function getMutedTextColor(background: string | RGB, baseText?: string) {
  const bg = typeof background === "string" ? parseColor(background) : background;
  const fg = parseColor(getReadableTextColor(bg, baseText));
  return rgbToCss(mixColors(fg, bg, 0.7));
}

export function generateThemePalette(adminConfig: ThemeConfig) {
  const bg = parseColor(adminConfig.bgColor, WHITE);
  const surface = parseColor(adminConfig.surfaceColor, bg);
  const primary = parseColor(adminConfig.primaryColor, BLACK);
  const text = getReadableTextColor(bg);
  return {
    "--theme-bg": rgbToCss(bg),
    "--theme-surface": rgbToCss(surface),
    "--theme-primary": rgbToCss(primary),
    "--theme-primary-foreground": getReadableTextColor(primary),
    "--theme-border": rgbToCss(mixColors(bg, BLACK, 0.15)),
    "--theme-text": text,
    "--theme-text-on-surface": getReadableTextColor(surface, text),
    "--theme-text-muted": getMutedTextColor(bg, text),
    "--radius": adminConfig.radius,
  } as Record<string, string>;
}

export type ThemeHealthStatus = "pass" | "warn" | "fail";
export type ThemeHealthCheck = { id: string; label: string; foreground: string; background: string; ratio: number; minRatio: number; status: ThemeHealthStatus; message?: string };

export function getThemeHealthChecks(adminConfig: ThemeConfig): ThemeHealthCheck[] {
  const p = generateThemePalette(adminConfig);
  const ratio = Number(getContrastRatio(p["--theme-text"], p["--theme-bg"]).toFixed(2));
  return [{ id: "body_on_page", label: "Body On Page", foreground: p["--theme-text"], background: p["--theme-bg"], ratio, minRatio: 4.5, status: ratio >= 4.5 ? "pass" : ratio >= 4.1 ? "warn" : "fail" }];
}

export function getThemeReadabilityReport(adminConfig: ThemeConfig) {
  const checks = getThemeHealthChecks(adminConfig);
  return { palette: generateThemePalette(adminConfig), checks, pass: checks.every((c) => c.status === "pass") };
}
