import type { ThemeSkin } from "@/types/theme";
import starterThemeSkinsRaw from "./starterThemeSkins.data.json";

const STARTER_THEME_SKINS_DATA = starterThemeSkinsRaw as ThemeSkin[];

export const STARTER_THEME_SKINS: ThemeSkin[] = STARTER_THEME_SKINS_DATA;
export const STARTER_THEME_SKIN_MAP = new Map(STARTER_THEME_SKINS.map((s) => [s.id, s]));

export const VIBRANT_SUNSET_CORAL_SKIN_ID = "vibrant_sunset_coral";
export const HAUTE_BLANC_SKIN_ID = "haute_blanc";
export const GALLERY_MINIMAL_SKIN_ID = "gallery_minimal";
export const OBSIDIAN_BLACK_GOLD_SKIN_ID = "obsidian_black_gold";
export const MIDNIGHT_TITANIUM_SKIN_ID = "midnight_titanium";
export const FESTIVE_RUBY_GOLD_SKIN_ID = "festive_ruby_gold";
export const AETHERIAL_BLANC_SKIN_ID = "aetherial_blanc";
export const ORGANIC_SANDSTONE_SKIN_ID = "organic_sandstone";

export const VIBRANT_SUNSET_CORAL_SKIN = STARTER_THEME_SKIN_MAP.get(VIBRANT_SUNSET_CORAL_SKIN_ID)!;
export const HAUTE_BLANC_SKIN = STARTER_THEME_SKIN_MAP.get(HAUTE_BLANC_SKIN_ID)!;
export const GALLERY_MINIMAL_SKIN = STARTER_THEME_SKIN_MAP.get(GALLERY_MINIMAL_SKIN_ID)!;
export const OBSIDIAN_BLACK_GOLD_SKIN = STARTER_THEME_SKIN_MAP.get(OBSIDIAN_BLACK_GOLD_SKIN_ID)!;
export const MIDNIGHT_TITANIUM_SKIN = STARTER_THEME_SKIN_MAP.get(MIDNIGHT_TITANIUM_SKIN_ID)!;
export const FESTIVE_RUBY_GOLD_SKIN = STARTER_THEME_SKIN_MAP.get(FESTIVE_RUBY_GOLD_SKIN_ID)!;
export const AETHERIAL_BLANC_SKIN = STARTER_THEME_SKIN_MAP.get(AETHERIAL_BLANC_SKIN_ID)!;
export const ORGANIC_SANDSTONE_SKIN = STARTER_THEME_SKIN_MAP.get(ORGANIC_SANDSTONE_SKIN_ID)!;
