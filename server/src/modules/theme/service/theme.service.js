const repo = require('../repository/theme.repository');
const { DEFAULT_THEME_CONFIG } = require('../theme.default');
const {
  DEFAULT_SKIN_ID,
  DEFAULT_HOLIDAY_SKIN_ID,
  DEFAULT_THEME_HOLIDAY_RULES,
  FALLBACK_THEME_SKIN,
  STOREFRONT_DESIGN_LOCKS,
  THEME_PRESETS,
} = require('../theme.presets');
const { writeAuditLog } = require('../../../utils/auditLog');

const ENUMS = {
  shadowStyle: ['none', 'subtle', 'soft', 'medium', 'glow'],
  buttonStyle: ['pill', 'rounded', 'square'],
  navStyle: ['clean', 'floating', 'glass'],
  badgeStyle: ['solid', 'soft', 'outline'],
  priceStyle: ['normal', 'bold', 'luxury'],
  productCardVariant: ['standard', 'premium', 'deal', 'compact'],
  cardStyle: ['bordered', 'seamless', 'elevated', 'minimal'],
  cardTextAlign: ['left', 'center'],
  imageRatio: ['1 / 1', '4 / 5', '3 / 4', '16 / 9'],
  imageFit: ['cover', 'contain'],
  homeLayout: ['classic', 'premium', 'deal', 'magazine'],
  headerStyle: ['clean', 'premium', 'transparent', 'dark'],
  bannerStyle: ['clean', 'premium', 'deal', 'dark', 'fresh'],
  couponStyle: ['ticket', 'premium', 'deal', 'minimal'],
  memberCardStyle: ['light', 'gold', 'blackGold', 'fresh'],
  categoryIconStyle: ['circle', 'soft', 'solid', 'outline'],
  motionLevel: ['none', 'soft', 'rich'],
  density: ['comfortable', 'compact'],
  adminThemeMode: ['fixed', 'follow_store'],
};

const HEX6 = /^#[0-9A-F]{6}$/i;
const MAX_SKINS = 20;
const MAX_HOLIDAY_RULES = 48;
const MAX_SKIN_NAME_LEN = 40;
const MAX_SKIN_CATEGORY_LEN = 32;
const MAX_PAYLOAD_BYTES = 512 * 1024;
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

function badRequest(message) {
  const err = /** @type {any} */ (new Error(message));
  err.statusCode = 400;
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
    const id = String(skin.id || '').trim();
    const name = String(skin.name || '').trim();
    if (!SKIN_ID_RE.test(id)) throw badRequest(`皮肤 ID 格式不合法：${id || '(空)'}`);
    if (!name || name.length > MAX_SKIN_NAME_LEN) throw badRequest('皮肤名称长度必须为 1-40 个字符');
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
    productCardVariant: pickEnum(raw.productCardVariant, 'productCardVariant', 'standard'),
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
    adminThemeMode: pickEnum(raw.adminThemeMode, 'adminThemeMode', 'fixed'),
    ...STOREFRONT_DESIGN_LOCKS,
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

function normalizeThemeSkinRecord(skin, fallback) {
  const base = fallback || FALLBACK_THEME_SKIN;
  if (!skin || typeof skin !== 'object') return null;
  const id = String(skin.id || base.id || '').trim();
  if (!id) return null;
  const name = typeof skin.name === 'string' && skin.name.trim() ? skin.name.trim() : base.name || id;
  const description = typeof skin.description === 'string' && skin.description.trim()
    ? skin.description.trim()
    : base.description;
  const sceneTag = normalizeSceneTag(skin.sceneTag, base.sceneTag || 'default');
  return {
    ...base,
    id,
    name,
    description,
    category: normalizeCategory(skin.category, base.category || LEGACY_SCENE_CATEGORY_LABELS[sceneTag] || LEGACY_SCENE_CATEGORY_LABELS.default),
    sceneTag,
    config: normalizeThemeConfig(skin.config || base.config),
  };
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

function resolveRuntimeThemeSkinId(payload, date = new Date()) {
  const today = monthDayFromDate(date);
  const hasSkin = (id) => !!id && payload.skins.some((skin) => skin.id === id);
  const rule = payload.holidayRules.find(
    (item) => item.enabled && isMonthDayInRange(today, item.start, item.end) && hasSkin(item.skinId || payload.holidaySkinId),
  );
  const chosen = rule?.skinId || (rule ? payload.holidaySkinId : payload.activeSkinId);
  return hasSkin(chosen) ? chosen : payload.activeSkinId;
}

function normalizeThemeSkinsPayload(rawPayload) {
  const payload = rawPayload && typeof rawPayload === 'object' ? rawPayload : {};
  const incoming = Array.isArray(payload.skins) ? payload.skins : [];
  const incomingById = new Map();
  incoming.forEach((skin) => {
    if (!skin || typeof skin !== 'object') return;
    const id = String(skin.id || '').trim();
    if (!id) return;
    incomingById.set(id, skin);
  });

  const presetIds = new Set(THEME_PRESETS.map((preset) => preset.id));
  const presetSkins = THEME_PRESETS.map((preset) => {
    const existing = incomingById.get(preset.id);
    return {
      ...preset,
      name: typeof existing?.name === 'string' && existing.name.trim() ? existing.name.trim() : preset.name,
      description: typeof existing?.description === 'string' && existing.description.trim()
        ? existing.description.trim()
        : preset.description,
      category: typeof existing?.category === 'string' && existing.category.trim()
        ? existing.category.trim().slice(0, MAX_SKIN_CATEGORY_LEN)
        : preset.category,
      sceneTag: preset.sceneTag,
      config: normalizeThemeConfig(existing?.config || preset.config),
    };
  });
  const seenCustomIds = new Set();
  const customSkins = incoming
    .map((skin) => normalizeThemeSkinRecord(skin))
    .filter((skin) => {
      if (!skin || presetIds.has(skin.id) || seenCustomIds.has(skin.id)) return false;
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

  const systemDefaultSkinId = skins.some((skin) => skin.id === DEFAULT_SKIN_ID) ? DEFAULT_SKIN_ID : skins[0].id;
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
async function getThemeSkins() {
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

async function getActiveThemeConfig() {
  const data = await getThemeSkins();
  const runtimeId = data.runtimeSkinId || resolveRuntimeThemeSkinId(data);
  const active = data.skins.find((s) => s.id === runtimeId) || data.skins[0];
  return active?.config || DEFAULT_THEME_CONFIG;
}

async function updateThemeConfig(themeConfig, adminUserId, req) {
  const before = await getActiveThemeConfig();
  const next = normalizeThemeConfig(themeConfig);
  const payload = await getThemeSkins();
  const activeId = payload.activeSkinId || payload.defaultSkinId || DEFAULT_SKIN_ID;
  const skins = payload.skins.map((skin) => (skin.id === activeId ? { ...skin, config: next } : skin));
  const full = normalizeThemeSkinsPayload({ ...payload, skins });
  await repo.upsertThemeSkins(JSON.stringify(full));
  await repo.upsertThemeConfig(JSON.stringify(next));
  await writeAuditLog({
    req,
    operatorId: adminUserId,
    actionType: 'settings.theme_update',
    objectType: 'site_settings',
    objectId: 'theme_config',
    summary: '更新商城主题设置',
    before,
    after: next,
    result: 'success',
  });
  return next;
}

async function updateThemeSkins(themeSkinsPayload, adminUserId, req) {
  assertThemeSkinsPayload(themeSkinsPayload);
  const before = await getThemeSkins();
  const next = normalizeThemeSkinsPayload(themeSkinsPayload);
  await repo.upsertThemeSkins(JSON.stringify(next));
  const runtimeId = next.runtimeSkinId || resolveRuntimeThemeSkinId(next);
  const active = next.skins.find((s) => s.id === runtimeId) || next.skins[0];
  await repo.upsertThemeConfig(JSON.stringify(active?.config || DEFAULT_THEME_CONFIG));
  await writeAuditLog({
    req,
    operatorId: adminUserId,
    actionType: 'settings.theme_skins_update',
    objectType: 'site_settings',
    objectId: 'theme_skins',
    summary: '更新皮肤列表与当前皮肤',
    before,
    after: next,
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
  updateThemeSkins,
};
