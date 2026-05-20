// @ts-nocheck
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');
const { NEUTRAL_SITE_DESCRIPTION, resolveSiteDescription, resolveSiteName } = require('../../../config/instance');

const ICON_CACHE = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

function getProductApi() {
  return /** @type {any} */ (require('../../product')).api || {};
}

function hashBrand(input) {
  return crypto.createHash('sha1').update(String(input || '')).digest('hex').slice(0, 12);
}

function resolvePublicUrl(req, maybeUrl) {
  const value = String(maybeUrl || '').trim();
  if (!value) return '';
  if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('data:')) return value;
  const proto = req.get('x-forwarded-proto') || req.protocol || 'https';
  const host = req.get('host');
  if (!host) return value;
  return `${proto}://${host}${value.startsWith('/') ? value : `/${value}`}`;
}

async function loadSiteInfoSafe() {
  try {
    return await getProductApi().getPublicSiteInfo();
  } catch (error) {
    console.warn('[pwa] failed to load site settings:', error.message || error);
    return {};
  }
}

async function loadImageBuffer(sourceUrl) {
  if (!sourceUrl) return null;
  if (sourceUrl.startsWith('data:')) {
    const match = sourceUrl.match(/^data:[^;]+;base64,(.+)$/);
    return match ? Buffer.from(match[1], 'base64') : null;
  }
  const response = await fetch(sourceUrl, { redirect: 'follow' });
  if (!response.ok) throw new Error(`logo fetch failed: ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

function getFallbackLogoPath() {
  const root = path.resolve(__dirname, '../../../../../click-send-shop-main/click-send-shop-main');
  const candidates = [
    path.join(root, 'src/assets/logo.webp'),
    path.join(root, 'src/assets/logo.png'),
    path.join(root, 'src/assets/logo-icon.png'),
  ];
  return candidates.find((file) => fs.existsSync(file)) || null;
}

async function buildIconBuffer({ logoUrl, size, maskable, fallbackPath }) {
  const cacheKey = `${logoUrl}|${size}|${maskable ? 'maskable' : 'standard'}`;
  const cached = ICON_CACHE.get(cacheKey);
  if (cached && Date.now() - cached.time < CACHE_TTL_MS) return cached.buffer;

  let sourceBuffer = null;
  if (logoUrl) sourceBuffer = await loadImageBuffer(logoUrl);
  if (!sourceBuffer && fallbackPath) sourceBuffer = await fs.promises.readFile(fallbackPath);
  if (!sourceBuffer) throw new Error('No PWA icon source available');

  const safeLogoSize = maskable ? Math.round(size * 0.66) : size;
  const logo = await sharp(sourceBuffer)
    .rotate()
    .resize(safeLogoSize, safeLogoSize, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 0 },
      withoutEnlargement: false,
    })
    .png()
    .toBuffer();

  const buffer = await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: maskable
        ? { r: 255, g: 255, b: 255, alpha: 1 }
        : { r: 255, g: 255, b: 255, alpha: 0 },
    },
  })
    .composite([{ input: logo, gravity: 'center' }])
    .png()
    .toBuffer();

  ICON_CACHE.set(cacheKey, { time: Date.now(), buffer });
  return buffer;
}

async function buildManifest(req, iconBasePath = '/api/pwa') {
  const siteInfo = await loadSiteInfoSafe();
  const siteName = resolveSiteName(siteInfo);
  const description = resolveSiteDescription(siteInfo) || NEUTRAL_SITE_DESCRIPTION;
  const logoUrl = resolvePublicUrl(req, siteInfo.logoUrl || siteInfo.faviconUrl || '');
  const version = hashBrand(`${siteName}|${description}|${logoUrl}`);
  return {
    name: siteName,
    short_name: siteName.slice(0, 12),
    description,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    theme_color: '#D4AF37',
    background_color: '#ffffff',
    lang: 'zh-CN',
    icons: [
      { src: `${iconBasePath}/icon-192x192.png?v=${version}`, sizes: '192x192', type: 'image/png' },
      { src: `${iconBasePath}/icon-512x512.png?v=${version}`, sizes: '512x512', type: 'image/png' },
      { src: `${iconBasePath}/icon-maskable-512x512.png?v=${version}`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}

async function buildIcon(req, { size, maskable }) {
  const siteInfo = await loadSiteInfoSafe();
  const logoUrl = resolvePublicUrl(req, siteInfo.logoUrl || siteInfo.faviconUrl || '');
  return buildIconBuffer({ logoUrl, size, maskable, fallbackPath: getFallbackLogoPath() });
}

module.exports = {
  buildManifest,
  buildIcon,
};
