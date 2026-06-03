import {
  DEFAULT_HOLIDAY_SKIN_ID,
  DEFAULT_SKIN_ID,
  DEFAULT_THEME_HOLIDAY_RULES,
  FALLBACK_THEME_SKIN,
  PREMIUM_CHAMPAGNE_IVORY_CONFIG,
  RETIRED_SYSTEM_SKIN_IDS,
  THEME_PRESETS,
} from "@/constants/themePresets";
import { applyStorefrontDesignLocks } from "@/constants/themeDesignLocks";
import type {
  ThemeSceneTag,
  AdminThemeMode,
  BadgeStyle,
  BannerStyle,
  ButtonStyle,
  CardStyle,
  CardTextAlign,
  CategoryIconStyle,
  CouponStyle,
  Density,
  HeaderStyle,
  HomeLayout,
  ImageFit,
  ImageRatio,
  MemberCardStyle,
  MotionLevel,
  NavStyle,
  PriceStyle,
  ProductCardVariant,
  ShadowStyle,
  ThemeConfig,
  ThemeHolidayRule,
  ThemeSkin,
  ThemeSkinsPayload,
} from "@/types/theme";
import { getMutedTextColor, getReadableTextColor, parseColor } from "@/utils/themeContrast";

const HEX6 = /^#[0-9a-f]{6}$/i;

const SHADOW_VALUES: ShadowStyle[] = ["none", "subtle", "soft", "medium", "glow"];
const BUTTON_VALUES: ButtonStyle[] = ["pill", "rounded", "square"];
const NAV_VALUES: NavStyle[] = ["clean", "floating", "glass"];
const BADGE_VALUES: BadgeStyle[] = ["solid", "soft", "outline"];
const PRICE_VALUES: PriceStyle[] = ["normal", "bold", "luxury"];
const PRODUCT_CARD_VALUES: ProductCardVariant[] = ["standard", "premium", "deal", "compact"];
const CARD_STYLE_VALUES: CardStyle[] = ["bordered", "seamless", "elevated", "minimal"];
const CARD_ALIGN_VALUES: CardTextAlign[] = ["left", "center"];
const IMAGE_RATIO_VALUES: ImageRatio[] = ["1 / 1", "4 / 5", "3 / 4", "16 / 9"];
const IMAGE_FIT_VALUES: ImageFit[] = ["cover", "contain"];
const HOME_LAYOUT_VALUES: HomeLayout[] = ["classic", "premium", "deal", "magazine"];
const HEADER_STYLE_VALUES: HeaderStyle[] = ["clean", "premium", "transparent", "dark"];
const BANNER_STYLE_VALUES: BannerStyle[] = ["clean", "premium", "deal", "dark", "fresh"];
const COUPON_STYLE_VALUES: CouponStyle[] = ["ticket", "premium", "deal", "minimal"];
const MEMBER_CARD_VALUES: MemberCardStyle[] = ["light", "gold", "blackGold", "fresh"];
const CATEGORY_ICON_VALUES: CategoryIconStyle[] = ["circle", "soft", "solid", "outline"];
const MOTION_VALUES: MotionLevel[] = ["none", "soft", "rich"];
const DENSITY_VALUES: Density[] = ["comfortable", "compact"];
const ADMIN_MODE_VALUES: AdminThemeMode[] = ["fixed", "follow_store"];
const MAX_HOLIDAY_RULES = 48;
const SCENE_TAG_VALUES: ThemeSceneTag[] = [
  "default",
  "life_service",
  "premium",
  "visa",
  "mall",
  "admin",
  "promotion",
  "holiday",
];

const PRESET_SCENE_BY_ID: Record<string, ThemeSceneTag> = {
  premium_champagne_ivory: "premium",
  premium_pearl_blush: "premium",
  premium_porcelain_jade: "premium",
  premium_sky_silk: "mall",
  premium_apricot_sand: "mall",
  festival_spring_ruby_gold: "holiday",
  festival_moon_orange_gold: "holiday",
  default_life_green: "mall",
  premium_ivory_jade: "premium",
  premium_black_gold: "premium",
  professional_blue: "visa",
  promo_red_orange: "promotion",
  festive_ruby_gold: "holiday",
  fresh_cyan: "life_service",
  minimalist_grey: "mall",
};

const LEGACY_SCENE_CATEGORY_LABELS: Record<ThemeSceneTag, string> = {
  default: "默认分类",
  life_service: "生活服务",
  premium: "高端商城",
  visa: "签证留学",
  mall: "日常商城",
  admin: "后台管理",
  promotion: "促销活动",
  holiday: "节日活动",
};

function normalizeCategory(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, 32) : fallback;
}

function pickEnum<T extends string>(value: unknown, values: readonly T[], fallback: T): T {
  if (typeof value !== "string") return fallback;
  return (values as readonly string[]).includes(value) ? (value as T) : fallback;
}

function normalizeHex(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const raw = value.trim();
  if (!raw) return fallback;
  if (raw.startsWith("#") && HEX6.test(raw)) return raw.toUpperCase();
  if (!raw.startsWith("#") && HEX6.test(`#${raw}`)) return `#${raw.toUpperCase()}`;
  return fallback;
}

function normalizeRadius(value: unknown, fallback: string): string {
  if (typeof value === "number" && Number.isFinite(value)) return `${Math.max(0, value)}px`;
  if (typeof value !== "string") return fallback;
  const raw = value.trim();
  if (!raw) return fallback;
  if (/^\d+(\.\d+)?$/.test(raw)) return `${raw}px`;
  if (/^\d+(\.\d+)?(px|rem|em|%)$/.test(raw)) return raw;
  return fallback;
}

function normalizeShadow(value: unknown, fallback: ShadowStyle): ShadowStyle {
  if (value === "flat") return "none";
  if (value === "brutalism") return "medium";
  if (value === "soft") return "soft";
  return pickEnum(value, SHADOW_VALUES, fallback);
}

function normalizeFontFamily(value: unknown, fallback: string): string {
  if (typeof value !== "string" || !value.trim()) return fallback;
  return value.trim();
}

export function normalizeThemeConfig(input: Partial<ThemeConfig> | null | undefined): ThemeConfig {
  const base = PREMIUM_CHAMPAGNE_IVORY_CONFIG;
  const raw = (input ?? {}) as Record<string, unknown>;

  const bgColor = normalizeHex(raw.bgColor, base.bgColor);
  const surfaceColor = normalizeHex(raw.surfaceColor, base.surfaceColor);
  const primaryColor = normalizeHex(raw.primaryColor, base.primaryColor);
  const secondaryColor = normalizeHex(raw.secondaryColor, base.secondaryColor);
  const accentColor = normalizeHex(raw.accentColor ?? raw.secondaryColor, secondaryColor || base.accentColor);
  const priceColor = normalizeHex(raw.priceColor, base.priceColor);
  const borderColor = normalizeHex(raw.borderColor, base.borderColor);
  const dangerColor = normalizeHex(raw.dangerColor ?? raw.priceColor, base.dangerColor);
  const successColor = normalizeHex(raw.successColor, base.successColor);
  const warningColor = normalizeHex(raw.warningColor, base.warningColor);

  const safeText = getReadableTextColor(parseColor(bgColor), typeof raw.textColor === "string" ? raw.textColor : base.textColor);
  const textColor = normalizeHex(raw.textColor, safeText);
  const safeMuted = getMutedTextColor(parseColor(bgColor), textColor);
  const mutedTextColor = normalizeHex(raw.mutedTextColor, safeMuted);

  return applyStorefrontDesignLocks({
    skinName: typeof raw.skinName === "string" && raw.skinName.trim() ? raw.skinName.trim() : base.skinName,
    radius: normalizeRadius(raw.radius, base.radius),
    fontFamily: normalizeFontFamily(raw.fontFamily, base.fontFamily),

    primaryColor,
    secondaryColor,
    accentColor,
    priceColor,
    bgColor,
    surfaceColor,
    borderColor,
    textColor,
    mutedTextColor,

    successColor,
    warningColor,
    dangerColor,

    shadowStyle: normalizeShadow(raw.shadowStyle, base.shadowStyle),
    buttonStyle: pickEnum(raw.buttonStyle, BUTTON_VALUES, base.buttonStyle),
    navStyle: pickEnum(raw.navStyle, NAV_VALUES, base.navStyle),
    badgeStyle: pickEnum(raw.badgeStyle, BADGE_VALUES, base.badgeStyle),
    priceStyle: pickEnum(raw.priceStyle, PRICE_VALUES, base.priceStyle),

    productCardVariant: pickEnum(raw.productCardVariant, PRODUCT_CARD_VALUES, base.productCardVariant),
    cardStyle: pickEnum(raw.cardStyle, CARD_STYLE_VALUES, base.cardStyle),
    cardTextAlign: pickEnum(raw.cardTextAlign, CARD_ALIGN_VALUES, base.cardTextAlign),
    imageRatio: pickEnum(raw.imageRatio, IMAGE_RATIO_VALUES, base.imageRatio),
    imageFit: pickEnum(raw.imageFit, IMAGE_FIT_VALUES, base.imageFit),

    homeLayout: pickEnum(raw.homeLayout, HOME_LAYOUT_VALUES, base.homeLayout),
    headerStyle: pickEnum(raw.headerStyle, HEADER_STYLE_VALUES, base.headerStyle),
    bannerStyle: pickEnum(raw.bannerStyle, BANNER_STYLE_VALUES, base.bannerStyle),

    couponStyle: pickEnum(raw.couponStyle, COUPON_STYLE_VALUES, base.couponStyle),
    memberCardStyle: pickEnum(raw.memberCardStyle, MEMBER_CARD_VALUES, base.memberCardStyle),
    categoryIconStyle: pickEnum(raw.categoryIconStyle, CATEGORY_ICON_VALUES, base.categoryIconStyle),

    motionLevel: pickEnum(raw.motionLevel, MOTION_VALUES, base.motionLevel),
    density: pickEnum(raw.density, DENSITY_VALUES, base.density),

    adminThemeMode: pickEnum(raw.adminThemeMode, ADMIN_MODE_VALUES, "fixed"),
  });
}

export function mergeThemeConfig(config: Partial<ThemeConfig> | null | undefined): ThemeConfig {
  return normalizeThemeConfig(config);
}

function normalizeSceneTag(skin: Partial<ThemeSkin>): ThemeSceneTag {
  if (typeof skin.sceneTag === "string" && SCENE_TAG_VALUES.includes(skin.sceneTag as ThemeSceneTag)) {
    return skin.sceneTag as ThemeSceneTag;
  }
  return PRESET_SCENE_BY_ID[skin.id] || "default";
}

export function normalizeThemeSkin(skin: Partial<ThemeSkin> & { id: string; name: string }): ThemeSkin {
  const description =
    typeof skin.description === "string" && skin.description.trim() ? skin.description.trim() : undefined;
  const sceneTag = normalizeSceneTag(skin);
  return {
    id: skin.id,
    name: skin.name.trim() || skin.id,
    description,
    category: normalizeCategory(skin.category, LEGACY_SCENE_CATEGORY_LABELS[sceneTag]),
    sceneTag,
    config: normalizeThemeConfig(skin.config),
  };
}

/** 两套系统皮肤固定保留，避免后台误删后前台质感规则失效。 */
export function canDeleteThemeSkin(skinId: string, defaultSkinId: string, skinCount: number): { ok: boolean; message?: string } {
  if (THEME_PRESETS.some((skin) => skin.id === skinId)) {
    return { ok: false, message: "系统保留的日常皮肤和节日皮肤不能删除" };
  }
  if (skinCount <= 1) return { ok: false, message: "至少保留一套皮肤" };
  if (skinId === defaultSkinId) return { ok: false, message: "默认皮肤无法删除，请先将其他皮肤设为默认" };
  return { ok: true };
}

const MONTH_DAY_RE = /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

function normalizeMonthDay(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const raw = value.trim();
  return MONTH_DAY_RE.test(raw) ? raw : fallback;
}

export function normalizeThemeHolidayRule(
  rule: Partial<ThemeHolidayRule> & { id?: string; name?: string },
  fallback?: ThemeHolidayRule,
): ThemeHolidayRule {
  const base = fallback ?? DEFAULT_THEME_HOLIDAY_RULES[0];
  const id = typeof rule.id === "string" && rule.id.trim() ? rule.id.trim() : base.id;
  const name = typeof rule.name === "string" && rule.name.trim() ? rule.name.trim() : base.name;
  return {
    id,
    name,
    enabled: rule.enabled !== false,
    start: normalizeMonthDay(rule.start, base.start),
    end: normalizeMonthDay(rule.end, base.end),
    skinId: typeof rule.skinId === "string" && rule.skinId.trim() ? rule.skinId.trim() : base.skinId,
  };
}

export function normalizeThemeHolidayRules(input: unknown): ThemeHolidayRule[] {
  const incoming = Array.isArray(input) ? input : [];
  if (incoming.length === 0) return DEFAULT_THEME_HOLIDAY_RULES.map((rule) => ({ ...rule }));
  const byId = new Map(DEFAULT_THEME_HOLIDAY_RULES.map((rule) => [rule.id, rule]));
  return incoming
    .filter((rule): rule is Partial<ThemeHolidayRule> => !!rule && typeof rule === "object")
    .slice(0, MAX_HOLIDAY_RULES)
    .map((rule) => normalizeThemeHolidayRule(rule, typeof rule.id === "string" ? byId.get(rule.id) : undefined));
}

export function normalizeThemeSkinsPayload(payload: {
  defaultSkinId?: string;
  activeSkinId?: string;
  runtimeSkinId?: string;
  holidaySkinId?: string;
  holidayRules?: ThemeHolidayRule[];
  skins?: Array<Partial<ThemeSkin> & { id: string; name: string }>;
} | null | undefined): {
  defaultSkinId: string;
  activeSkinId: string;
  runtimeSkinId?: string;
  holidaySkinId: string;
  holidayRules: ThemeHolidayRule[];
  skins: ThemeSkin[];
} {
  const incoming = payload ?? {};
  const normalizedIncoming = Array.isArray(incoming.skins) ? incoming.skins.map(normalizeThemeSkin) : [];
  const incomingById = new Map(normalizedIncoming.map((skin) => [skin.id, skin]));
  const presetIds = new Set(THEME_PRESETS.map((skin) => skin.id));
  const presetSkins = THEME_PRESETS.map((preset) => {
    const existing = incomingById.get(preset.id);
    return {
      ...preset,
      name: existing?.name?.trim() || preset.name,
      description: existing?.description || preset.description,
      category: existing?.category?.trim() || preset.category,
      config: normalizeThemeConfig(existing?.config ?? preset.config),
    };
  });
  const customSkins = normalizedIncoming.filter((skin) => !presetIds.has(skin.id) && !RETIRED_SYSTEM_SKIN_IDS.has(skin.id));
  const skins = [...presetSkins, ...customSkins];

  if (skins.length === 0) {
    skins.push({
      ...FALLBACK_THEME_SKIN,
      config: normalizeThemeConfig(FALLBACK_THEME_SKIN.config),
    });
  }

  const systemDefaultSkinId = skins.some((skin) => skin.id === DEFAULT_SKIN_ID) ? DEFAULT_SKIN_ID : skins[0].id;
  const hasSkin = (id: string | undefined | null) => !!id && skins.some((skin) => skin.id === id);
  const defaultSkinId = hasSkin(incoming.defaultSkinId) ? String(incoming.defaultSkinId) : systemDefaultSkinId;
  const activeSkinId = hasSkin(incoming.activeSkinId) ? String(incoming.activeSkinId) : defaultSkinId;
  const holidaySkinId = hasSkin(incoming.holidaySkinId)
    ? String(incoming.holidaySkinId)
    : hasSkin(DEFAULT_HOLIDAY_SKIN_ID)
      ? DEFAULT_HOLIDAY_SKIN_ID
      : activeSkinId;
  const holidayRules = normalizeThemeHolidayRules(incoming.holidayRules).map((rule) => ({
    ...rule,
    skinId: hasSkin(rule.skinId) ? rule.skinId : holidaySkinId,
  }));
  const runtimeSkinId = hasSkin(incoming.runtimeSkinId) ? String(incoming.runtimeSkinId) : undefined;

  return { defaultSkinId, activeSkinId, runtimeSkinId, holidaySkinId, holidayRules, skins };
}

function monthDayFromDate(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${month}-${day}`;
}

function isMonthDayInRange(value: string, start: string, end: string): boolean {
  if (start <= end) return value >= start && value <= end;
  return value >= start || value <= end;
}

export function resolveRuntimeThemeSkinId(
  payload: Pick<ThemeSkinsPayload, "activeSkinId" | "holidaySkinId" | "holidayRules" | "skins">,
  date = new Date(),
): string {
  const today = monthDayFromDate(date);
  const hasSkin = (id: string | undefined | null) => !!id && payload.skins.some((skin) => skin.id === id);
  const holidayRule = payload.holidayRules.find(
    (rule) => rule.enabled && isMonthDayInRange(today, rule.start, rule.end) && hasSkin(rule.skinId || payload.holidaySkinId),
  );
  const chosen = holidayRule?.skinId || (holidayRule ? payload.holidaySkinId : payload.activeSkinId);
  return hasSkin(chosen) ? String(chosen) : payload.activeSkinId;
}
