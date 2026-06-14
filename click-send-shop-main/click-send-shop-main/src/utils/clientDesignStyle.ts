import {
  CLIENT_BLACK_GOLD_SKIN_ID,
  CLIENT_BLUE_PORTAL_SKIN_ID,
  CLIENT_DEEP_ENTERPRISE_SKIN_ID,
  CLIENT_SKY_TECH_SKIN_ID,
} from "@/constants/themePresets";

export type ClientDesignStyle = "blue_portal" | "sky_tech" | "black_gold" | "deep_enterprise" | "classic";

const SKIN_STYLE_MAP: Record<string, ClientDesignStyle> = {
  [CLIENT_BLUE_PORTAL_SKIN_ID]: "blue_portal",
  [CLIENT_SKY_TECH_SKIN_ID]: "sky_tech",
  [CLIENT_BLACK_GOLD_SKIN_ID]: "black_gold",
  [CLIENT_DEEP_ENTERPRISE_SKIN_ID]: "deep_enterprise",
};

export function getClientDesignStyleBySkinId(skinId?: string | null): ClientDesignStyle {
  if (!skinId) return "classic";
  const normalized = skinId.startsWith("preview-") ? skinId.replace(/^preview-/, "") : skinId;
  return SKIN_STYLE_MAP[normalized] ?? "classic";
}

export function isDarkClientDesignStyle(style: ClientDesignStyle) {
  return style === "black_gold";
}
