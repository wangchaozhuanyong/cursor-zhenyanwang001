const crypto = require('crypto');
const repo = require('../repository/theme.repository');
const { DEFAULT_THEME_CONFIG } = require('../theme.default');
const {
  DEFAULT_SKIN_ID,
  DEFAULT_HOLIDAY_SKIN_ID,
  DEFAULT_THEME_HOLIDAY_RULES,
  FALLBACK_THEME_SKIN,
  RETIRED_SYSTEM_SKIN_IDS,
  THEME_PRESETS,
} = require('../theme.presets');
const { writeAuditLog } = require('../../../utils/auditLog');

const ENUMS = {
  shadowStyle: ['none', 'subtle', 'soft', 'medium', 'glow', 'aerial', 'paper', 'velvet', 'lantern', 'moonlight'],
  buttonStyle: ['pill', 'rounded', 'square', 'capsule'],
  navStyle: ['clean', 'floating', 'glass', 'glassLine'],
  badgeStyle: ['solid', 'soft', 'outline', 'technical', 'botanical', 'jewel', 'festivalSeal'],
  priceStyle: ['normal', 'bold', 'luxury', 'tabularBold'],
  productCardVariant: ['standard', 'premium', 'deal', 'compact', 'spec', 'editorial', 'lookbook', 'giftSet', 'pairedGift'],
  cardStyle: ['bordered', 'seamless', 'elevated', 'minimal', 'glassBordered', 'paperLayered', 'framelessFloat', 'silkBordered', 'moonHaloBordered'],
  cardTextAlign: ['left', 'center'],
  imageRatio: ['1 / 1', '4 / 5', '3 / 4', '4 / 3', '16 / 9'],
  imageFit: ['cover', 'contain'],
  homeLayout: ['classic', 'premium', 'deal', 'magazine', 'modularShowcase', 'courtyardMasonry', 'runwayEditorial', 'festivalScroll', 'lunarGarden'],
  headerStyle: ['clean', 'premium', 'transparent', 'dark', 'floatingGlass', 'splitEditorial', 'minimalCentered', 'redLine', 'quietLine'],
  bannerStyle: ['clean', 'premium', 'deal', 'dark', 'fresh', 'panoramicLight', 'naturalWindow', 'archedMirror', 'lightLacquer', 'moonHalo'],
  couponStyle: ['ticket', 'premium', 'deal', 'minimal', 'precisionVoucher', 'perforatedTicket', 'silkRibbon', 'redPacket', 'moonTicket'],
  memberCardStyle: ['light', 'gold', 'blackGold', 'fresh', 'titaniumBlue', 'walnutCopper', 'plumSilver', 'jadeGold', 'indigoGold'],
  categoryIconStyle: ['circle', 'soft', 'solid', 'outline', 'monoGlyph', 'botanicalLine', 'jewelOutline', 'auspiciousSeal', 'lunarSeal'],
  motionLevel: ['none', 'soft', 'rich'],
  density: ['comfortable', 'compact', 'airy'],
  textureIntensity: ['subtle', 'medium'],
  festivalMode: ['none', 'springFestival', 'midAutumn'],
  festivalActivation: ['manual', 'manualOrLunarSchedule'],
  festivalDateMode: ['solar', 'lunar'],
  decorativeDensity: ['quiet', 'balanced', 'rich'],
  skinType: ['evergreen', 'festival'],
  skinStatus: ['draft', 'published', 'disabled'],
};

const HEX6 = /^#[0-9A-F]{6}$/i;
const MAX_SKINS = 50;
const MAX_HOLIDAY_RULES = 48;
const MAX_SKIN_NAME_LEN = 80;
const MAX_SKIN_CATEGORY_LEN = 64;
const MAX_PAYLOAD_BYTES = 768 * 1024;
const SKIN_ID_RE = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/;
const MONTH_DAY_RE = /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const SCENE_TAGS = new Set(['default', 'life_service', 'premium', 'visa', 'mall', 'admin', 'promotion', 'holiday']);
const LEGACY_SCENE_CATEGORY_LABELS = {
  default: '默认分类',
  life_service: '生活服务',
  premium: '高端商城',
  visa: '签证留学',
  mall: '日常商城',
  admin: '后台管理',
  promotion: '促销活动',
  holiday: '节日活动',
};
const LUNAR_FESTIVAL_DATES = {
  2026: { springFestival: '2026-02-17', midAutumn: '2026-09-25' },
  2027: { springFestival: '2027-02-06', midAutumn: '2027-09-15' },
  2028: { springFestival: '2028-01-26', midAutumn: '2028-10-03' },
  2029: { springFestival: '2029-02-13', midAutumn: '2029-09-22' },
  2030: { springFestival: '2030-02-03', midAutumn: '2030-09-12' },
  2031: { springFestival: '2031-01-23', midAutumn: '2031-10-01' },
};

function badRequest(message) {
  const err = /** @type {any} */ (new Error(message));
  err.statusCode = 400;
  return err;
}

function notFound(message) {
  const err = /** @type {any} */ (new Error(message));
  err.statusCode = 404;
  return err;
}

function assertThemeSkinsPayload(rawPayload) {
  if (!rawPayload || typeof rawPayload !== 'object') throw badRequest('皮肤配置格式不正确');
  const serialized = JSON.stringify(rawPayload);
  if (serialized.length > MAX_PAYLOAD_BYTES) throw badRequest('皮肤配置数据过大');
  const incoming = Array.isArray(rawPayload.skins) ? rawPayload.skins : [];
  if (incoming.length < 1) throw badRequest('至少保留一个皮肤');
  if (incoming.length > MAX_SKINS) throw badRequest(`最多保留 ${MAX_SKINS} 个皮肤`);
  incoming.forEach((skin) => {
    if (!skin || typeof skin !== 'object') throw badRequest('皮肤格式不正确');
    const id = String(skin.id || skin.themeKey || '').trim();
    const name = String(skin.name || '').trim();
    if (!SKIN_ID_RE.test(id)) throw badRequest(`皮肤 ID 格式不合法：${id || '(空)'}`);
    if (!name || name.length > MAX_SKIN_NAME_LEN) throw badRequest('皮肤名称长度必须为 1-80 个字符');
    const category = String(skin.category || '').trim();
    if (category.length > MAX_SKIN_CATEGORY_LEN) throw badRequest(`皮肤分类最多 ${MAX_SKIN_CATEGORY_LEN} 个字符`);
  });
}

function pickEnum(value, key, fallback) {
  return ENUMS[key].includes(value) ? value : fallback;
}

function normalizeHex(value, fallback) {
  if (typeof value !== 'string') return fallback;
  const raw = value.trim();
  if (!raw) return fallback;
  const v = raw.startsWith('#') ? raw : `#${raw}`;
  return HEX6.test(v) ? v.toUpperCase() : fallback;
}

function normalizeRadius(value, fallback) {
  if (typeof value === 'number' && Number.isFinite(value)) return `${Math.max(0, value)}px`;
  if (typeof value !== 'string') return fallback;
  const raw = value.trim();
  if (!raw) return fallback;
  if (/^\d+(\.\d+)?$/.test(raw)) return `${raw}px`;
  if (/^\d+(\.\d+)?(px|rem|em|%)$/.test(raw)) return raw;
  return fallback;
}

function textForBg(bgColor) {
  const hex = (bgColor || '#F7F2EA').replace('#', '');
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.62 ? '#1C1712' : '#F7EFD9';
}

function mutedFromText(text) {
  return text === '#F7EFD9' ? '#A99B7A' : '#7A6C5D';
}

function normalizeShadow(value, fallback) {
  if (value === 'flat') return 'none';
  if (value === 'brutalism') return 'medium';
  return pickEnum(value, 'shadowStyle', fallback);
}

function parseJsonMaybe(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;
  if (typeof value !== 'string') return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function normalizeShortText(value, fallback, max = 64) {
  if (typeof value !== 'string') return fallback;
  const raw = value.trim();
  return raw ? raw.slice(0, max) : fallback;
}

function normalizeRatioNumber(value, fallback, min = 0, max = 1) {
  const n = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : Number.NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function normalizeInt(value, fallback, min = 0, max = 365) {
  const n = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : Number.NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function normalizeTextureConfig(rawValue, fallback) {
  const raw = rawValue && typeof rawValue === 'object' ? rawValue : {};
  return {
    material: normalizeShortText(raw.material, fallback.material),
    intensity: pickEnum(raw.intensity, 'textureIntensity', fallback.intensity),
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

function normalizeFestivalConfig(rawValue, fallback) {
  const raw = rawValue && typeof rawValue === 'object' ? rawValue : {};
  const fallbackSkinId = typeof raw.fallbackSkinId === 'string' && raw.fallbackSkinId.trim()
    ? raw.fallbackSkinId.trim()
    : raw.fallbackSkinId === null
      ? null
      : fallback.fallbackSkinId;
  return {
    mode: pickEnum(raw.mode, 'festivalMode', fallback.mode),
    activation: pickEnum(raw.activation, 'festivalActivation', fallback.activation),
    dateMode: pickEnum(raw.dateMode, 'festivalDateMode', fallback.dateMode),
    leadDays: normalizeInt(raw.leadDays, fallback.leadDays, 0, 60),
    tailDays: normalizeInt(raw.tailDays, fallback.tailDays, 0, 45),
    decorativeDensity: pickEnum(raw.decorativeDensity, 'decorativeDensity', fallback.decorativeDensity),
    showCountdown: raw.showCountdown === undefined ? fallback.showCountdown : raw.showCountdown === true,
    fallbackSkinId,
  };
}

function normalizeThemeConfig(rawConfig) {
  if (!rawConfig || typeof rawConfig !== 'object') return { ...DEFAULT_THEME_CONFIG };
  const raw = rawConfig.light && typeof rawConfig.light === 'object' ? rawConfig.light : rawConfig;
  const base = DEFAULT_THEME_CONFIG;
  const bgColor = normalizeHex(raw.bgColor, base.bgColor);
  const secondaryColor = normalizeHex(raw.secondaryColor, base.secondaryColor);
  const textColor = normalizeHex(raw.textColor, textForBg(bgColor));
  const mutedTextColor = normalizeHex(raw.mutedTextColor, mutedFromText(textColor));
  return {
    skinName: typeof raw.skinName === 'string' && raw.skinName.trim() ? raw.skinName.trim() : base.skinName,
    radius: normalizeRadius(raw.radius, base.radius),
    fontFamily: typeof raw.fontFamily === 'string' && raw.fontFamily.trim() ? raw.fontFamily.trim() : base.fontFamily,
    primaryColor: normalizeHex(raw.primaryColor, base.primaryColor),
    secondaryColor,
    accentColor: normalizeHex(raw.accentColor ?? raw.secondaryColor, secondaryColor),
    priceColor: normalizeHex(raw.priceColor, base.priceColor),
    bgColor,
    surfaceColor: normalizeHex(raw.surfaceColor, base.surfaceColor),
    borderColor: normalizeHex(raw.borderColor, base.borderColor),
    textColor,
    mutedTextColor,
    successColor: normalizeHex(raw.successColor, base.successColor),
    warningColor: normalizeHex(raw.warningColor, base.warningColor),
    dangerColor: normalizeHex(raw.dangerColor ?? raw.priceColor, base.dangerColor),
    shadowStyle: normalizeShadow(raw.shadowStyle, base.shadowStyle),
    buttonStyle: pickEnum(raw.buttonStyle, 'buttonStyle', base.buttonStyle),
    navStyle: pickEnum(raw.navStyle, 'navStyle', base.navStyle),
    badgeStyle: pickEnum(raw.badgeStyle, 'badgeStyle', base.badgeStyle),
    priceStyle: pickEnum(raw.priceStyle, 'priceStyle', base.priceStyle),
    productCardVariant: pickEnum(raw.productCardVariant, 'productCardVariant', base.productCardVariant),
    cardStyle: pickEnum(raw.cardStyle, 'cardStyle', base.cardStyle),
    cardTextAlign: pickEnum(raw.cardTextAlign, 'cardTextAlign', base.cardTextAlign),
    imageRatio: pickEnum(raw.imageRatio, 'imageRatio', base.imageRatio),
    imageFit: pickEnum(raw.imageFit, 'imageFit', base.imageFit),
    homeLayout: pickEnum(raw.homeLayout, 'homeLayout', base.homeLayout),
    headerStyle: pickEnum(raw.headerStyle, 'headerStyle', base.headerStyle),
    bannerStyle: pickEnum(raw.bannerStyle, 'bannerStyle', base.bannerStyle),
    couponStyle: pickEnum(raw.couponStyle, 'couponStyle', base.couponStyle),
    memberCardStyle: pickEnum(raw.memberCardStyle, 'memberCardStyle', base.memberCardStyle),
    categoryIconStyle: pickEnum(raw.categoryIconStyle, 'categoryIconStyle', base.categoryIconStyle),
    motionLevel: pickEnum(raw.motionLevel, 'motionLevel', base.motionLevel),
    density: pickEnum(raw.density, 'density', base.density),
    adminThemeMode: 'fixed',
    texture: normalizeTextureConfig(raw.texture, base.texture),
    festival: normalizeFestivalConfig(raw.festival, base.festival),
  };
}

function normalizeMonthDay(value, fallback) {
  if (typeof value !== 'string') return fallback;
  const raw = value.trim();
  return MONTH_DAY_RE.test(raw) ? raw : fallback;
}

function normalizeHolidayRule(rule, fallback) {
  const base = fallback || DEFAULT_THEME_HOLIDAY_RULES[0];
  return {
    id: typeof rule?.id === 'string' && rule.id.trim() ? rule.id.trim() : base.id,
    name: typeof rule?.name === 'string' && rule.name.trim() ? rule.name.trim() : base.name,
    enabled: rule?.enabled !== false,
    start: normalizeMonthDay(rule?.start, base.start),
    end: normalizeMonthDay(rule?.end, base.end),
    skinId: typeof rule?.skinId === 'string' && rule.skinId.trim() ? rule.skinId.trim() : base.skinId,
  };
}

function normalizeHolidayRules(rawRules) {
  const incoming = Array.isArray(rawRules) ? rawRules : [];
  if (!incoming.length) return DEFAULT_THEME_HOLIDAY_RULES.map((rule) => ({ ...rule }));
  const byId = new Map(DEFAULT_THEME_HOLIDAY_RULES.map((rule) => [rule.id, rule]));
  return incoming
    .filter((rule) => rule && typeof rule === 'object')
    .slice(0, MAX_HOLIDAY_RULES)
    .map((rule) => normalizeHolidayRule(rule, byId.get(String(rule.id || ''))));
}

function normalizeSceneTag(value, fallback = 'default') {
  return typeof value === 'string' && SCENE_TAGS.has(value) ? value : fallback;
}

function normalizeCategory(value, fallback) {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, MAX_SKIN_CATEGORY_LEN) : fallback;
}

function normalizeNullableDate(value) {
  if (!value) return null;
  if (value instanceof Date && Number.isFinite(value.getTime())) return value.toISOString().slice(0, 10);
  if (typeof value !== 'string') return null;
  const raw = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const date = new Date(raw);
  return Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 10) : null;
}

function normalizeThemeSkinRecord(skin, fallback) {
  const base = fallback || FALLBACK_THEME_SKIN;
  if (!skin || typeof skin !== 'object') return null;
  const parsedConfig = parseJsonMaybe(skin.configJson || skin.config_json);
  const id = String(skin.id || skin.themeKey || skin.theme_key || base.id || '').trim();
  if (!id) return null;
  const name = typeof skin.name === 'string' && skin.name.trim() ? skin.name.trim() : base.name || id;
  const description = typeof skin.description === 'string' && skin.description.trim()
    ? skin.description.trim()
    : base.description;
  const sceneTag = normalizeSceneTag(skin.sceneTag, base.sceneTag || (skin.type === 'festival' ? 'holiday' : 'default'));
  return {
    ...base,
    id,
    themeKey: id,
    name,
    description,
    category: normalizeCategory(skin.category, base.category || LEGACY_SCENE_CATEGORY_LABELS[sceneTag] || LEGACY_SCENE_CATEGORY_LABELS.default),
    sceneTag,
    type: pickEnum(skin.type, 'skinType', sceneTag === 'holiday' ? 'festival' : base.type || 'evergreen'),
    status: pickEnum(skin.status, 'skinStatus', base.status || 'published'),
    isDefault: skin.isDefault === true || skin.isDefault === 1,
    startAt: normalizeNullableDate(skin.startAt),
    endAt: normalizeNullableDate(skin.endAt),
    priority: normalizeInt(skin.priority, base.priority || 0, -9999, 9999),
    updatedAt: skin.updatedAt instanceof Date
      ? skin.updatedAt.toISOString()
      : typeof skin.updatedAt === 'string'
        ? skin.updatedAt
        : undefined,
    config: normalizeThemeConfig(skin.config || parsedConfig || base.config),
  };
}

function normalizeThemeSkinsPayload(rawPayload) {
  const payload = rawPayload && typeof rawPayload === 'object' ? rawPayload : {};
  const incoming = Array.isArray(payload.skins) ? payload.skins : [];
  const incomingById = new Map();
  incoming.forEach((skin) => {
    if (!skin || typeof skin !== 'object') return;
    const id = String(skin.id || skin.themeKey || '').trim();
    if (!id) return;
    incomingById.set(id, skin);
  });

  const presetIds = new Set(THEME_PRESETS.map((preset) => preset.id));
  const hasModernPresetInput = incoming.some((skin) => presetIds.has(String(skin?.id || skin?.themeKey || '').trim()));
  const presetsToMerge = incoming.length === 0 || !hasModernPresetInput
    ? THEME_PRESETS
    : THEME_PRESETS.filter((preset) => incomingById.has(preset.id));
  const presetSkins = presetsToMerge.map((preset) => {
    const existing = incomingById.get(preset.id);
    const normalizedExisting = existing ? normalizeThemeSkinRecord(existing, preset) : null;
    return {
      ...preset,
      ...(normalizedExisting || {}),
      id: preset.id,
      themeKey: preset.id,
      name: normalizedExisting?.name || preset.name,
      description: normalizedExisting?.description || preset.description,
      category: normalizedExisting?.category || preset.category,
      sceneTag: preset.sceneTag,
      config: normalizeThemeConfig(normalizedExisting?.config || preset.config),
    };
  });
  const seenCustomIds = new Set();
  const customSkins = incoming
    .map((skin) => normalizeThemeSkinRecord(skin))
    .filter((skin) => {
      if (
        !skin
        || presetIds.has(skin.id)
        || RETIRED_SYSTEM_SKIN_IDS.has(skin.id)
        || seenCustomIds.has(skin.id)
      ) return false;
      seenCustomIds.add(skin.id);
      return true;
    });
  const skins = [...presetSkins, ...customSkins];

  if (!skins.length) {
    skins.push({
      ...FALLBACK_THEME_SKIN,
      config: normalizeThemeConfig(FALLBACK_THEME_SKIN.config),
    });
  }

  const firstDefault = skins.find((skin) => skin.isDefault && skin.status !== 'disabled');
  const systemDefaultSkinId = firstDefault?.id || (skins.some((skin) => skin.id === DEFAULT_SKIN_ID) ? DEFAULT_SKIN_ID : skins[0].id);
  const hasSkin = (id) => !!id && skins.some((skin) => skin.id === id);
  const defaultSkinId = hasSkin(payload.defaultSkinId) ? String(payload.defaultSkinId) : systemDefaultSkinId;
  const activeSkinId = hasSkin(payload.activeSkinId) ? String(payload.activeSkinId) : defaultSkinId;
  const holidaySkinId = hasSkin(payload.holidaySkinId)
    ? String(payload.holidaySkinId)
    : hasSkin(DEFAULT_HOLIDAY_SKIN_ID)
      ? DEFAULT_HOLIDAY_SKIN_ID
      : activeSkinId;
  const holidayRules = normalizeHolidayRules(payload.holidayRules).map((rule) => ({
    ...rule,
    skinId: hasSkin(rule.skinId) ? rule.skinId : holidaySkinId,
  }));
  const runtimeSkinId = resolveRuntimeThemeSkinId({ activeSkinId, holidaySkinId, holidayRules, skins });
  return { defaultSkinId, activeSkinId, runtimeSkinId, holidaySkinId, holidayRules, skins };
}

function monthDayFromDate(date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${month}-${day}`;
}

function isMonthDayInRange(value, start, end) {
  if (start <= end) return value >= start && value <= end;
  return value >= start || value <= end;
}

function startOfLocalDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function parseLocalDate(value) {
  if (!value) return null;
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isFinite(date.getTime()) ? date : null;
}

function isDateInWindow(date, start, end) {
  const day = startOfLocalDay(date).getTime();
  return day >= startOfLocalDay(start).getTime() && day <= startOfLocalDay(end).getTime();
}

function isFestivalSkinActive(skin, date) {
  if (skin.type !== 'festival' || skin.status !== 'published') return false;
  const manualStart = parseLocalDate(skin.startAt);
  const manualEnd = parseLocalDate(skin.endAt);
  if (manualStart && manualEnd && isDateInWindow(date, manualStart, manualEnd)) return true;
  const festival = skin.config?.festival || {};
  if (festival.mode === 'none' || festival.activation !== 'manualOrLunarSchedule') return false;
  const festivalDate = LUNAR_FESTIVAL_DATES[date.getFullYear()]?.[festival.mode];
  const center = parseLocalDate(festivalDate);
  if (!center) return false;
  return isDateInWindow(date, addDays(center, -festival.leadDays), addDays(center, festival.tailDays));
}

function resolveRuntimeThemeSkinId(payload, date = new Date()) {
  const today = monthDayFromDate(date);
  const hasSkin = (id) => !!id && payload.skins.some((skin) => skin.id === id && skin.status !== 'disabled');
  const publishedSkins = payload.skins.filter((skin) => skin.status === 'published');
  const festivalSkin = publishedSkins
    .filter((skin) => isFestivalSkinActive(skin, date))
    .sort((a, b) => (b.priority || 0) - (a.priority || 0))[0];
  if (festivalSkin) return festivalSkin.id;
  const rule = payload.holidayRules.find(
    (item) => item.enabled && isMonthDayInRange(today, item.start, item.end) && hasSkin(item.skinId || payload.holidaySkinId),
  );
  const chosen = rule?.skinId || (rule ? payload.holidaySkinId : payload.activeSkinId);
  return hasSkin(chosen) ? chosen : payload.activeSkinId;
}

function publicPayloadFrom(payload) {
  const publicSkins = payload.skins.filter((skin) => skin.status === 'published');
  const skins = publicSkins.length ? publicSkins : THEME_PRESETS.map((skin) => normalizeThemeSkinRecord(skin)).filter(Boolean);
  const hasSkin = (id) => !!id && skins.some((skin) => skin.id === id);
  const defaultSkinId = hasSkin(payload.defaultSkinId) ? payload.defaultSkinId : (hasSkin(DEFAULT_SKIN_ID) ? DEFAULT_SKIN_ID : skins[0]?.id);
  const activeSkinId = hasSkin(payload.activeSkinId) ? payload.activeSkinId : defaultSkinId;
  const holidaySkinId = hasSkin(payload.holidaySkinId) ? payload.holidaySkinId : (hasSkin(DEFAULT_HOLIDAY_SKIN_ID) ? DEFAULT_HOLIDAY_SKIN_ID : activeSkinId);
  const holidayRules = normalizeHolidayRules(payload.holidayRules).map((rule) => ({
    ...rule,
    skinId: hasSkin(rule.skinId) ? rule.skinId : holidaySkinId,
  }));
  const runtimeSkinId = resolveRuntimeThemeSkinId({ activeSkinId, holidaySkinId, holidayRules, skins });
  return { defaultSkinId, activeSkinId, runtimeSkinId, holidaySkinId, holidayRules, skins };
}

async function readLegacyThemeSkins() {
  const skinsRaw = await repo.selectThemeSkinsRaw();
  if (skinsRaw) {
    try {
      return normalizeThemeSkinsPayload(JSON.parse(skinsRaw));
    } catch {
      // continue fallback
    }
  }
  const themeRaw = await repo.selectThemeConfigRaw();
  const fallbackConfig = themeRaw ? normalizeThemeConfig(JSON.parse(themeRaw)) : DEFAULT_THEME_CONFIG;
  return normalizeThemeSkinsPayload({
    defaultSkinId: DEFAULT_SKIN_ID,
    activeSkinId: DEFAULT_SKIN_ID,
    skins: [{ ...FALLBACK_THEME_SKIN, config: fallbackConfig }],
  });
}

async function readTableThemeSkins({ includeDrafts = false } = {}) {
  const rows = await repo.selectThemeSkinRows();
  if (!rows || rows.length === 0) return null;
  const sourceRows = rows.map((row) => ({
    ...row,
    configJson: includeDrafts && row.draftConfigJson ? row.draftConfigJson : row.configJson,
  }));
  const skins = sourceRows.map((row) => normalizeThemeSkinRecord(row)).filter(Boolean);
  const defaultSkin = skins.find((skin) => skin.isDefault && skin.status !== 'disabled')
    || skins.find((skin) => skin.id === DEFAULT_SKIN_ID)
    || skins[0];
  const payload = normalizeThemeSkinsPayload({
    defaultSkinId: defaultSkin?.id,
    activeSkinId: defaultSkin?.id,
    holidaySkinId: skins.find((skin) => skin.id === DEFAULT_HOLIDAY_SKIN_ID)?.id || DEFAULT_HOLIDAY_SKIN_ID,
    holidayRules: DEFAULT_THEME_HOLIDAY_RULES,
    skins,
  });
  return includeDrafts ? payload : publicPayloadFrom(payload);
}

async function getThemeSkins() {
  return await readTableThemeSkins({ includeDrafts: false }) || publicPayloadFrom(await readLegacyThemeSkins());
}

async function getAdminThemeSkins() {
  return await readTableThemeSkins({ includeDrafts: true }) || await readLegacyThemeSkins();
}

async function getActiveThemeConfig() {
  const data = await getThemeSkins();
  const runtimeId = data.runtimeSkinId || resolveRuntimeThemeSkinId(data);
  const active = data.skins.find((s) => s.id === runtimeId) || data.skins[0];
  return active?.config || DEFAULT_THEME_CONFIG;
}

function toRepositoryRow(skin) {
  return {
    themeKey: skin.id,
    name: skin.name,
    description: skin.description || null,
    category: skin.category || null,
    type: skin.type || 'evergreen',
    status: skin.status || 'published',
    configJson: JSON.stringify(normalizeThemeConfig(skin.config)),
    draftConfigJson: skin.draftConfigJson || null,
    isDefault: skin.isDefault === true,
    startAt: skin.startAt || null,
    endAt: skin.endAt || null,
    priority: skin.priority || 0,
  };
}

function statusAfterDraftSave(existingStatus) {
  if (existingStatus === 'disabled') return 'disabled';
  if (existingStatus === 'published') return 'published';
  return 'draft';
}

async function upsertPayloadToTable(payload) {
  const normalized = normalizeThemeSkinsPayload(payload);
  await Promise.all(normalized.skins.map((skin) => repo.upsertThemeSkin(toRepositoryRow(skin))));
  const defaultSkin = normalized.skins.find((skin) => skin.id === normalized.defaultSkinId);
  if (defaultSkin) await repo.setOnlyDefaultThemeSkin(defaultSkin.id);
  return normalized;
}

async function syncLegacySiteSettings(payload) {
  const full = normalizeThemeSkinsPayload(payload);
  const publicFull = publicPayloadFrom(full);
  await repo.upsertThemeSkins(JSON.stringify(full));
  const runtimeId = publicFull.runtimeSkinId || resolveRuntimeThemeSkinId(publicFull);
  const active = publicFull.skins.find((s) => s.id === runtimeId) || publicFull.skins[0];
  await repo.upsertThemeConfig(JSON.stringify(active?.config || DEFAULT_THEME_CONFIG));
}

async function updateThemeConfig(themeConfig, adminUserId, req) {
  const before = await getActiveThemeConfig();
  const next = normalizeThemeConfig(themeConfig);
  const payload = await getAdminThemeSkins();
  const activeId = payload.activeSkinId || payload.defaultSkinId || DEFAULT_SKIN_ID;
  const skins = payload.skins.map((skin) => (
    skin.id === activeId
      ? { ...skin, config: next, status: statusAfterDraftSave(skin.status) }
      : skin
  ));
  const full = await upsertPayloadToTable({ ...payload, skins });
  await syncLegacySiteSettings(full);
  await writeAuditLog({
    req,
    operatorId: adminUserId,
    actionType: 'settings.theme_update',
    objectType: 'theme_skins',
    objectId: activeId,
    summary: '更新商城主题草稿',
    before,
    after: next,
    result: 'success',
  });
  return next;
}

async function updateThemeSkins(themeSkinsPayload, adminUserId, req) {
  assertThemeSkinsPayload(themeSkinsPayload);
  const before = await getAdminThemeSkins();
  const next = normalizeThemeSkinsPayload(themeSkinsPayload);
  await upsertPayloadToTable(next);
  await syncLegacySiteSettings(next);
  await writeAuditLog({
    req,
    operatorId: adminUserId,
    actionType: 'settings.theme_skins_update',
    objectType: 'theme_skins',
    objectId: 'theme_skins',
    summary: '更新皮肤列表与当前皮肤',
    before,
    after: next,
    result: 'success',
  });
  return next;
}

async function saveThemeSkinDraft(themeKey, data, adminUserId, req) {
  if (!SKIN_ID_RE.test(String(themeKey || ''))) throw badRequest('皮肤 ID 格式不合法');
  const before = await getAdminThemeSkins();
  const existing = before.skins.find((skin) => skin.id === themeKey) || THEME_PRESETS.find((skin) => skin.id === themeKey);
  if (!existing) throw notFound('皮肤不存在');
  const nextSkin = normalizeThemeSkinRecord({
    ...existing,
    ...data,
    id: themeKey,
    themeKey,
    config: normalizeThemeConfig(data?.config || existing.config),
    status: statusAfterDraftSave(existing.status),
  }, existing);
  const affected = await repo.updateThemeSkinDraft(themeKey, JSON.stringify(nextSkin.config), nextSkin.status);
  if (!affected) {
    await repo.upsertThemeSkin({
      ...toRepositoryRow(nextSkin),
      configJson: JSON.stringify(normalizeThemeConfig(existing.config)),
      draftConfigJson: JSON.stringify(nextSkin.config),
    });
  }
  if (data?.isDefault === true) await repo.setOnlyDefaultThemeSkin(themeKey);
  const next = await getAdminThemeSkins();
  await syncLegacySiteSettings(await getThemeSkins());
  await writeAuditLog({
    req,
    operatorId: adminUserId,
    actionType: 'settings.theme_skin_draft_save',
    objectType: 'theme_skins',
    objectId: themeKey,
    summary: '保存主题皮肤草稿',
    before: existing,
    after: nextSkin,
    result: 'success',
  });
  return nextSkin;
}

async function createThemePreviewDraft(themeKey, data, adminUserId) {
  if (!SKIN_ID_RE.test(String(themeKey || ''))) throw badRequest('皮肤 ID 格式不合法');
  const payload = await getAdminThemeSkins();
  const skin = payload.skins.find((item) => item.id === themeKey) || THEME_PRESETS.find((item) => item.id === themeKey);
  if (!skin) throw notFound('皮肤不存在');
  const config = normalizeThemeConfig(data?.config || skin.config);
  const draftToken = crypto.randomBytes(24).toString('hex');
  const expiresAtDate = new Date(Date.now() + 2 * 60 * 60 * 1000);
  const expiresAt = expiresAtDate.toISOString().slice(0, 19).replace('T', ' ');
  await repo.deleteExpiredPreviewDrafts(new Date());
  await repo.insertPreviewDraft({
    draftToken,
    themeKey,
    configJson: JSON.stringify(config),
    createdBy: adminUserId,
    expiresAt,
  });
  return { draftToken, themeKey, expiresAt: expiresAtDate.toISOString() };
}

async function getThemePreviewDraft(draftToken) {
  const token = String(draftToken || '').trim();
  if (!/^[a-f0-9]{48}$/i.test(token)) throw notFound('预览草稿不存在或已过期');
  const row = await repo.selectPreviewDraft(token, new Date());
  if (!row) throw notFound('预览草稿不存在或已过期');
  const config = normalizeThemeConfig(parseJsonMaybe(row.configJson));
  const payload = await getAdminThemeSkins();
  const skin = payload.skins.find((item) => item.id === row.themeKey);
  return {
    draftToken: row.draftToken,
    themeKey: row.themeKey,
    name: skin?.name || row.themeKey,
    config,
    expiresAt: row.expiresAt instanceof Date ? row.expiresAt.toISOString() : row.expiresAt,
  };
}

async function publishThemeSkin(themeKey, data, adminUserId, req) {
  const payload = await getAdminThemeSkins();
  const skin = payload.skins.find((item) => item.id === themeKey);
  if (!skin) throw notFound('皮肤不存在');
  const nextSkin = { ...skin, status: 'published', config: normalizeThemeConfig(data?.config || skin.config) };
  if (data?.config) {
    await repo.upsertThemeSkin(toRepositoryRow(nextSkin));
  } else {
    await repo.publishThemeSkinDraft(themeKey, JSON.stringify(nextSkin.config));
  }
  if (data?.setDefault === true || skin.isDefault) await repo.setOnlyDefaultThemeSkin(themeKey);
  const next = await getAdminThemeSkins();
  await syncLegacySiteSettings(next);
  await writeAuditLog({
    req,
    operatorId: adminUserId,
    actionType: 'settings.theme_skin_publish',
    objectType: 'theme_skins',
    objectId: themeKey,
    summary: '发布主题皮肤',
    before: skin,
    after: nextSkin,
    result: 'success',
  });
  return next;
}

async function disableThemeSkin(themeKey, adminUserId, req) {
  const payload = await getAdminThemeSkins();
  const skin = payload.skins.find((item) => item.id === themeKey);
  if (!skin) throw notFound('皮肤不存在');
  const fallback = payload.skins.find((item) => item.id !== themeKey && item.status === 'published' && item.type !== 'festival')
    || payload.skins.find((item) => item.id !== themeKey && item.status === 'published');
  if (skin.isDefault && !fallback) throw badRequest('至少保留一套已发布皮肤作为默认皮肤');
  await repo.updateThemeSkinStatus(themeKey, 'disabled');
  if (skin.isDefault && fallback) await repo.setOnlyDefaultThemeSkin(fallback.id);
  const next = await getAdminThemeSkins();
  await syncLegacySiteSettings(next);
  await writeAuditLog({
    req,
    operatorId: adminUserId,
    actionType: 'settings.theme_skin_disable',
    objectType: 'theme_skins',
    objectId: themeKey,
    summary: '禁用主题皮肤',
    before: skin,
    after: next.skins.find((item) => item.id === themeKey),
    result: 'success',
  });
  return next;
}

module.exports = {
  normalizeThemeConfig,
  normalizeThemeSkinsPayload,
  resolveRuntimeThemeSkinId,
  getActiveThemeConfig,
  updateThemeConfig,
  getThemeSkins,
  getAdminThemeSkins,
  updateThemeSkins,
  saveThemeSkinDraft,
  createThemePreviewDraft,
  getThemePreviewDraft,
  publishThemeSkin,
  disableThemeSkin,
};
