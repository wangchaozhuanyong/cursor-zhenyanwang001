import {
  DEFAULT_HOLIDAY_SKIN_ID,
  DEFAULT_SKIN_ID,
  DEFAULT_THEME_HOLIDAY_RULES,
  FALLBACK_THEME_SKIN,
  PREMIUM_CHAMPAGNE_IVORY_CONFIG,
  RETIRED_SYSTEM_SKIN_IDS,
  THEME_PRESETS,
} from "@/constants/themePresets";
import type {
  ThemeSceneTag,
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
  ThemeDecorativeDensity,
  ThemeFestivalActivation,
  ThemeFestivalDateMode,
  ThemeFestivalMode,
  ThemeHolidayRule,
  ThemeSkin,
  ThemeSkinStatus,
  ThemeSkinType,
  ThemeSkinsPayload,
  ThemeTextureIntensity,
} from "@/types/theme";
import { getMutedTextColor, getReadableTextColor, parseColor } from "@/utils/themeContrast";

const HEX6 = /^#[0-9a-f]{6}$/i;

const SHADOW_VALUES: ShadowStyle[] = ["none", "subtle", "soft", "medium", "glow", "aerial", "paper", "velvet", "lantern", "moonlight"];
const BUTTON_VALUES: ButtonStyle[] = ["pill", "rounded", "square", "capsule"];
const NAV_VALUES: NavStyle[] = ["clean", "floating", "glass", "glassLine"];
const BADGE_VALUES: BadgeStyle[] = ["solid", "soft", "outline", "technical", "botanical", "jewel", "festivalSeal"];
const PRICE_VALUES: PriceStyle[] = ["normal", "bold", "luxury", "tabularBold"];
const PRODUCT_CARD_VALUES: ProductCardVariant[] = ["standard", "premium", "deal", "compact", "spec", "editorial", "lookbook", "giftSet", "pairedGift"];
const CARD_STYLE_VALUES: CardStyle[] = ["bordered", "seamless", "elevated", "minimal", "glassBordered", "paperLayered", "framelessFloat", "silkBordered", "moonHaloBordered"];
const CARD_ALIGN_VALUES: CardTextAlign[] = ["left", "center"];
const IMAGE_RATIO_VALUES: ImageRatio[] = ["1 / 1", "4 / 5", "3 / 4", "4 / 3", "16 / 9"];
const IMAGE_FIT_VALUES: ImageFit[] = ["cover", "contain"];
const HOME_LAYOUT_VALUES: HomeLayout[] = ["classic", "premium", "deal", "magazine", "modularShowcase", "courtyardMasonry", "runwayEditorial", "festivalScroll", "lunarGarden"];
const HEADER_STYLE_VALUES: HeaderStyle[] = ["clean", "premium", "transparent", "dark", "floatingGlass", "splitEditorial", "minimalCentered", "redLine", "quietLine"];
const BANNER_STYLE_VALUES: BannerStyle[] = ["clean", "premium", "deal", "dark", "fresh", "panoramicLight", "naturalWindow", "archedMirror", "lightLacquer", "moonHalo"];
const COUPON_STYLE_VALUES: CouponStyle[] = ["ticket", "premium", "deal", "minimal", "precisionVoucher", "perforatedTicket", "silkRibbon", "redPacket", "moonTicket"];
const MEMBER_CARD_VALUES: MemberCardStyle[] = ["light", "gold", "blackGold", "fresh", "titaniumBlue", "walnutCopper", "plumSilver", "jadeGold", "indigoGold"];
const CATEGORY_ICON_VALUES: CategoryIconStyle[] = ["circle", "soft", "solid", "outline", "monoGlyph", "botanicalLine", "jewelOutline", "auspiciousSeal", "lunarSeal"];
const MOTION_VALUES: MotionLevel[] = ["none", "soft", "rich"];
const DENSITY_VALUES: Density[] = ["comfortable", "compact", "airy"];
const THEME_SKIN_TYPES: ThemeSkinType[] = ["evergreen", "festival"];
const THEME_SKIN_STATUSES: ThemeSkinStatus[] = ["draft", "published", "disabled"];
const TEXTURE_INTENSITIES: ThemeTextureIntensity[] = ["subtle", "medium"];
const FESTIVAL_MODES: ThemeFestivalMode[] = ["none", "springFestival", "midAutumn"];
const FESTIVAL_ACTIVATIONS: ThemeFestivalActivation[] = ["manual", "manualOrLunarSchedule"];
const FESTIVAL_DATE_MODES: ThemeFestivalDateMode[] = ["solar", "lunar"];
const DECORATIVE_DENSITIES: ThemeDecorativeDensity[] = ["quiet", "balanced", "rich"];
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
  polar: "mall",
  moss: "mall",
  iris: "premium",
  newyear: "holiday",
  midautumn: "holiday",
  client_blue_portal: "mall",
  client_sky_tech: "mall",
  client_black_gold: "premium",
  client_deep_enterprise: "visa",
  premium_champagne_ivory: "mall",
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

function normalizeNullableDate(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date && Number.isFinite(value.getTime())) return value.toISOString().slice(0, 10);
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const date = new Date(raw);
  return Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 10) : null;
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

function normalizeShortText(value: unknown, fallback: string, max = 64): string {
  if (typeof value !== "string") return fallback;
  const raw = value.trim();
  return raw ? raw.slice(0, max) : fallback;
}

function normalizeRatioNumber(value: unknown, fallback: number, min = 0, max = 1): number {
  const n = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : Number.NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function normalizeInt(value: unknown, fallback: number, min = 0, max = 365): number {
  const n = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : Number.NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function normalizeTextureConfig(rawValue: unknown, fallback: ThemeConfig["texture"]): ThemeConfig["texture"] {
  const raw = rawValue && typeof rawValue === "object" ? rawValue as Record<string, unknown> : {};
  return {
    material: normalizeShortText(raw.material, fallback.material),
    intensity: pickEnum(raw.intensity, TEXTURE_INTENSITIES, fallback.intensity),
    surface: normalizeShortText(raw.surface, fallback.surface),
    grain: normalizeShortText(raw.grain, fallback.grain),
    grainOpacity: normalizeRatioNumber(raw.grainOpacity, fallback.grainOpacity, 0, 0.08),
    highlight: normalizeShortText(raw.highlight, fallback.highlight),
    highlightOpacity: normalizeRatioNumber(raw.highlightOpacity, fallback.highlightOpacity, 0, 0.2),
    metal: normalizeShortText(raw.metal, fallback.metal),
    pattern: normalizeShortText(raw.pattern, fallback.pattern),
    patternOpacity: normalizeRatioNumber(raw.patternOpacity, fallback.patternOpacity, 0, 0.12),
    line: normalizeShortText(raw.line, fallback.line),
    shadow: normalizeShortText(raw.shadow, fallback.shadow),
    temperature: normalizeShortText(raw.temperature, fallback.temperature),
    imageContrast: normalizeRatioNumber(raw.imageContrast, fallback.imageContrast, 0.7, 1.2),
    imageSaturation: normalizeRatioNumber(raw.imageSaturation, fallback.imageSaturation, 0.65, 1.1),
  };
}

function normalizeFestivalConfig(rawValue: unknown, fallback: ThemeConfig["festival"]): ThemeConfig["festival"] {
  const raw = rawValue && typeof rawValue === "object" ? rawValue as Record<string, unknown> : {};
  const fallbackSkinId = typeof raw.fallbackSkinId === "string" && raw.fallbackSkinId.trim()
    ? raw.fallbackSkinId.trim()
    : raw.fallbackSkinId === null
      ? null
      : fallback.fallbackSkinId;
  return {
    mode: pickEnum(raw.mode, FESTIVAL_MODES, fallback.mode),
    activation: pickEnum(raw.activation, FESTIVAL_ACTIVATIONS, fallback.activation),
    dateMode: pickEnum(raw.dateMode, FESTIVAL_DATE_MODES, fallback.dateMode),
    leadDays: normalizeInt(raw.leadDays, fallback.leadDays, 0, 60),
    tailDays: normalizeInt(raw.tailDays, fallback.tailDays, 0, 45),
    decorativeDensity: pickEnum(raw.decorativeDensity, DECORATIVE_DENSITIES, fallback.decorativeDensity),
    showCountdown: raw.showCountdown === undefined ? fallback.showCountdown : raw.showCountdown === true,
    fallbackSkinId,
  };
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

  return {
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

    adminThemeMode: "fixed",
    texture: normalizeTextureConfig(raw.texture, base.texture),
    festival: normalizeFestivalConfig(raw.festival, base.festival),
  };
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
  const id = skin.id || skin.themeKey || "";
  return {
    id,
    themeKey: typeof skin.themeKey === "string" && skin.themeKey.trim() ? skin.themeKey.trim() : id,
    name: skin.name.trim() || skin.id,
    description,
    category: normalizeCategory(skin.category, LEGACY_SCENE_CATEGORY_LABELS[sceneTag]),
    sceneTag,
    type: pickEnum(skin.type, THEME_SKIN_TYPES, sceneTag === "holiday" ? "festival" : "evergreen"),
    status: pickEnum(skin.status, THEME_SKIN_STATUSES, "published"),
    isDefault: skin.isDefault === true,
    startAt: normalizeNullableDate(skin.startAt),
    endAt: normalizeNullableDate(skin.endAt),
    priority: normalizeInt(skin.priority, 0, -9999, 9999),
    updatedAt: typeof skin.updatedAt === "string" ? skin.updatedAt : undefined,
    config: normalizeThemeConfig(skin.config),
  };
}

/** 系统默认皮肤固定保留，避免后台误删后前台质感规则失效。 */
export function canDeleteThemeSkin(skinId: string, defaultSkinId: string, skinCount: number): { ok: boolean; message?: string } {
  if (THEME_PRESETS.some((skin) => skin.id === skinId)) {
    return { ok: false, message: "系统保留的默认皮肤不能删除" };
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
  const hasModernPresetInput = normalizedIncoming.some((skin) => presetIds.has(skin.id));
  const presetsToMerge = incoming.length === 0 || !hasModernPresetInput
    ? THEME_PRESETS
    : THEME_PRESETS.filter((preset) => incomingById.has(preset.id));
  const presetSkins = presetsToMerge.map((preset) => {
    const existing = incomingById.get(preset.id);
    const normalizedExisting = existing ? normalizeThemeSkin(existing) : null;
    return {
      ...preset,
      name: existing?.name?.trim() || preset.name,
      description: existing?.description || preset.description,
      category: existing?.category?.trim() || preset.category,
      type: normalizedExisting?.type ?? preset.type,
      status: normalizedExisting?.status ?? preset.status,
      isDefault: normalizedExisting?.isDefault ?? preset.isDefault,
      startAt: normalizedExisting?.startAt ?? preset.startAt,
      endAt: normalizedExisting?.endAt ?? preset.endAt,
      priority: normalizedExisting?.priority ?? preset.priority,
      updatedAt: normalizedExisting?.updatedAt ?? preset.updatedAt,
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

const LUNAR_FESTIVAL_DATES: Record<string, Record<ThemeFestivalMode, string>> = {
  "2026": { springFestival: "2026-02-17", midAutumn: "2026-09-25", none: "" },
  "2027": { springFestival: "2027-02-06", midAutumn: "2027-09-15", none: "" },
  "2028": { springFestival: "2028-01-26", midAutumn: "2028-10-03", none: "" },
  "2029": { springFestival: "2029-02-13", midAutumn: "2029-09-22", none: "" },
  "2030": { springFestival: "2030-02-03", midAutumn: "2030-09-12", none: "" },
  "2031": { springFestival: "2031-01-23", midAutumn: "2031-10-01", none: "" },
};

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function parseLocalDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isFinite(date.getTime()) ? date : null;
}

function isDateInWindow(date: Date, start: Date, end: Date): boolean {
  const day = startOfLocalDay(date).getTime();
  return day >= startOfLocalDay(start).getTime() && day <= startOfLocalDay(end).getTime();
}

function isFestivalSkinActive(skin: ThemeSkin, date: Date): boolean {
  if (skin.type !== "festival" || skin.status !== "published") return false;
  const manualStart = parseLocalDate(skin.startAt);
  const manualEnd = parseLocalDate(skin.endAt);
  if (manualStart && manualEnd && isDateInWindow(date, manualStart, manualEnd)) return true;
  const festival = skin.config.festival;
  if (festival.mode === "none" || festival.activation !== "manualOrLunarSchedule") return false;
  const year = String(date.getFullYear());
  const festivalDate = LUNAR_FESTIVAL_DATES[year]?.[festival.mode];
  const center = parseLocalDate(festivalDate);
  if (!center) return false;
  return isDateInWindow(date, addDays(center, -festival.leadDays), addDays(center, festival.tailDays));
}

export function resolveRuntimeThemeSkinId(
  payload: Pick<ThemeSkinsPayload, "activeSkinId" | "holidaySkinId" | "holidayRules" | "skins">,
  date = new Date(),
): string {
  const today = monthDayFromDate(date);
  const hasSkin = (id: string | undefined | null) => !!id && payload.skins.some((skin) => skin.id === id && skin.status !== "disabled");
  const publishedSkins = payload.skins.filter((skin) => skin.status !== "disabled" && skin.status !== "draft");
  const festivalSkin = publishedSkins
    .filter((skin) => isFestivalSkinActive(skin, date))
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))[0];
  if (festivalSkin) return festivalSkin.id;
  const holidayRule = payload.holidayRules.find(
    (rule) => rule.enabled && isMonthDayInRange(today, rule.start, rule.end) && hasSkin(rule.skinId || payload.holidaySkinId),
  );
  const chosen = holidayRule?.skinId || (holidayRule ? payload.holidaySkinId : payload.activeSkinId);
  return hasSkin(chosen) ? String(chosen) : payload.activeSkinId;
}
