const repo = require('./theme.repository');
const { DEFAULT_THEME_CONFIG } = require('./theme.default');
const { DEFAULT_SKIN_ID, THEME_PRESETS } = require('./theme.presets');
const { writeAuditLog } = require('../../utils/auditLog');

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
    ...base,
    ...raw,
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
  };
}

function normalizeThemeSkinsPayload(rawPayload) {
  const payload = rawPayload && typeof rawPayload === 'object' ? rawPayload : {};
  const incoming = Array.isArray(payload.skins) ? payload.skins : [];
  const merged = new Map();
  THEME_PRESETS.forEach((skin) => merged.set(skin.id, { ...skin, config: normalizeThemeConfig(skin.config) }));
  incoming.forEach((skin) => {
    if (!skin || typeof skin !== 'object') return;
    const id = String(skin.id || '').trim() || `skin_${Math.random().toString(16).slice(2, 10)}`;
    const name = String(skin.name || '自定义皮肤').trim();
    merged.set(id, { id, name, config: normalizeThemeConfig(skin.config) });
  });
  const skins = Array.from(merged.values());
  const has = (id) => !!id && skins.some((s) => s.id === id);
  const defaultSkinId = has(payload.defaultSkinId) ? payload.defaultSkinId : DEFAULT_SKIN_ID;
  const activeSkinId = has(payload.activeSkinId)
    ? payload.activeSkinId
    : has(defaultSkinId)
      ? defaultSkinId
      : DEFAULT_SKIN_ID;
  return { defaultSkinId, activeSkinId, skins };
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
    skins: [{ id: DEFAULT_SKIN_ID, name: '经典金黑', config: fallbackConfig }],
  });
}

async function getActiveThemeConfig() {
  const data = await getThemeSkins();
  const active = data.skins.find((s) => s.id === data.activeSkinId) || data.skins[0];
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
    summary: '更新商城主题配置',
    before,
    after: next,
    result: 'success',
  });
  return next;
}

async function updateThemeSkins(themeSkinsPayload, adminUserId, req) {
  const before = await getThemeSkins();
  const next = normalizeThemeSkinsPayload(themeSkinsPayload);
  await repo.upsertThemeSkins(JSON.stringify(next));
  const active = next.skins.find((s) => s.id === next.activeSkinId) || next.skins[0];
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
  getActiveThemeConfig,
  updateThemeConfig,
  getThemeSkins,
  updateThemeSkins,
};
