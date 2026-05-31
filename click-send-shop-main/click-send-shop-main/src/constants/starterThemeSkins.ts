import type { ThemeSkin } from "@/types/theme";
import { DAILY_COMMERCE_SKIN, FESTIVAL_RUBY_GOLD_SKIN } from "@/constants/themePresets";
import starterThemeSkinsRaw from "./starterThemeSkins.data.json";

const STARTER_THEME_SKINS_DATA = starterThemeSkinsRaw as ThemeSkin[];

export const STARTER_THEME_SKINS: ThemeSkin[] = [DAILY_COMMERCE_SKIN, FESTIVAL_RUBY_GOLD_SKIN];
export const STARTER_THEME_SKIN_MAP = new Map(STARTER_THEME_SKINS.map((s) => [s.id, s]));

export const VIBRANT_SUNSET_CORAL_SKIN_ID = "vibrant_sunset_coral";
export const HAUTE_BLANC_SKIN_ID = "haute_blanc";
export const GALLERY_MINIMAL_SKIN_ID = "gallery_minimal";
export const OBSIDIAN_BLACK_GOLD_SKIN_ID = "obsidian_black_gold";
export const MIDNIGHT_TITANIUM_SKIN_ID = "midnight_titanium";
export const FESTIVE_RUBY_GOLD_SKIN_ID = "festive_ruby_gold";
export const AETHERIAL_BLANC_SKIN_ID = "aetherial_blanc";
export const ORGANIC_SANDSTONE_SKIN_ID = "organic_sandstone";

export const VIBRANT_SUNSET_CORAL_SKIN = DAILY_COMMERCE_SKIN;
export const HAUTE_BLANC_SKIN = DAILY_COMMERCE_SKIN;
export const GALLERY_MINIMAL_SKIN = DAILY_COMMERCE_SKIN;
export const OBSIDIAN_BLACK_GOLD_SKIN = FESTIVAL_RUBY_GOLD_SKIN;
export const MIDNIGHT_TITANIUM_SKIN = DAILY_COMMERCE_SKIN;
export const FESTIVE_RUBY_GOLD_SKIN = FESTIVAL_RUBY_GOLD_SKIN;
export const AETHERIAL_BLANC_SKIN = DAILY_COMMERCE_SKIN;
export const ORGANIC_SANDSTONE_SKIN = DAILY_COMMERCE_SKIN;

void STARTER_THEME_SKINS_DATA;
