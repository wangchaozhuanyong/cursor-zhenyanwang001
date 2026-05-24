// @ts-nocheck
const fs = require('fs');
const crypto = require('crypto');
const dns = require('dns').promises;
const net = require('net');
const sharp = require('sharp');
const { NEUTRAL_SITE_DESCRIPTION, resolveSiteDescription, resolveSiteName } = require('../../../config/instance');

const ICON_CACHE = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;
const ICON_CACHE_MAX_ENTRIES = 32;

function getFreshIconCacheEntry(cacheKey) {
  const cached = ICON_CACHE.get(cacheKey);
  if (!cached) return null;
  if (Date.now() - cached.time >= CACHE_TTL_MS) {
    ICON_CACHE.delete(cacheKey);
    return null;
  }
  return cached.buffer;
}

function setIconCacheEntry(cacheKey, buffer) {
  if (ICON_CACHE.has(cacheKey)) ICON_CACHE.delete(cacheKey);
  ICON_CACHE.set(cacheKey, { time: Date.now(), buffer });
  while (ICON_CACHE.size > ICON_CACHE_MAX_ENTRIES) {
    const oldest = ICON_CACHE.keys().next().value;
    if (oldest === undefined) break;
    ICON_CACHE.delete(oldest);
  }
}

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

function normalizeIpAddress(ip) {
  if (!ip) return '';
  if (net.isIPv4(ip)) return ip;
  const lower = String(ip).toLowerCase();
  const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return mapped[1];
  return lower;
}

function isPrivateIp(ip) {
  const normalized = normalizeIpAddress(ip);
  if (!normalized) return true;
  if (net.isIPv4(normalized)) {
    const parts = normalized.split('.').map((x) => Number(x));
    const [a, b] = parts;
    return a === 10
      || a === 127
      || (a === 169 && b === 254)
      || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && b === 168)
      || (a === 100 && b >= 64 && b <= 127)
      || a === 0;
  }
  return normalized === '::1'
    || normalized.startsWith('fc')
    || normalized.startsWith('fd')
    || normalized.startsWith('fe80:');
}

async function resolveSafeRemoteFetchTarget(sourceUrl) {
  let parsed;
  try {
    parsed = new URL(sourceUrl);
  } catch {
    throw new Error('Invalid PWA logo URL');
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Unsupported PWA logo URL protocol');
  }
  const records = await dns.lookup(parsed.hostname, { all: true, verbatim: true });
  const publicRecord = records.find((record) => !isPrivateIp(record.address));
  if (!publicRecord) {
    throw new Error('PWA logo URL resolves to a private address');
  }
  const port = parsed.port || (parsed.protocol === 'https:' ? '443' : '80');
  const pathWithQuery = `${parsed.pathname}${parsed.search}`;
  return {
    fetchUrl: `${parsed.protocol}//${publicRecord.address}:${port}${pathWithQuery}`,
    hostHeader: parsed.hostname,
  };
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
  if (String(sourceUrl).startsWith('data:image/')) {
    const match = String(sourceUrl).match(/^data:image\/[a-zA-Z0-9.+-]+;base64,(.+)$/);
    if (!match) throw new Error('Invalid PWA data image');
    return Buffer.from(match[1], 'base64');
  }
  const { fetchUrl, hostHeader } = await resolveSafeRemoteFetchTarget(sourceUrl);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);
  let response;
  try {
    response = await fetch(fetchUrl, {
      redirect: 'error',
      signal: controller.signal,
      headers: { Host: hostHeader },
    });
  } finally {
    clearTimeout(timer);
  }
  if (!response.ok) throw new Error(`logo fetch failed: ${response.status}`);
  const length = Number(response.headers.get('content-length') || 0);
  const maxBytes = 2 * 1024 * 1024;
  if (length > maxBytes) throw new Error('PWA logo response is too large');
  const reader = response.body?.getReader();
  if (!reader) return Buffer.from(await response.arrayBuffer());
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) throw new Error('PWA logo response is too large');
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks);
}

function getFallbackLogoPath() {
  return null;
}

async function buildIconBuffer({ logoUrl, size, maskable, fallbackPath }) {
  const cacheKey = `${logoUrl}|${size}|${maskable ? 'maskable' : 'standard'}`;
  const cachedBuffer = getFreshIconCacheEntry(cacheKey);
  if (cachedBuffer) return cachedBuffer;

  let sourceBuffer = null;
  if (logoUrl) {
    try {
      sourceBuffer = await loadImageBuffer(logoUrl);
    } catch (error) {
      console.warn('[pwa] failed to load brand logo:', error.message || error);
    }
  }
  if (!sourceBuffer && fallbackPath) sourceBuffer = await fs.promises.readFile(fallbackPath);
  if (!sourceBuffer) {
    return sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: maskable
          ? { r: 255, g: 255, b: 255, alpha: 1 }
          : { r: 255, g: 255, b: 255, alpha: 0 },
      },
    }).png().toBuffer();
  }

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

  setIconCacheEntry(cacheKey, buffer);
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
