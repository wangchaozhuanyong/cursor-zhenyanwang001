// @ts-nocheck
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const sharp = require('sharp');
const contentService = require('../product/service/content.service');

const ICON_CACHE = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

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
    return await contentService.getPublicSiteInfo();
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
  const root = path.resolve(__dirname, '../../../../click-send-shop-main/click-send-shop-main');
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

function createPwaBrandRouter(options = {}) {
  const router = express.Router();
  const iconBasePath = options.iconBasePath || '/api/pwa';
  const fallbackPath = getFallbackLogoPath();

  router.get('/manifest.webmanifest', async (req, res, next) => {
    try {
      const siteInfo = await loadSiteInfoSafe();
      const siteName = String(siteInfo.siteName || '大马通').trim() || '大马通';
      const description = String(siteInfo.siteDescription || '马来西亚优选商城').trim() || '马来西亚优选商城';
      const logoUrl = resolvePublicUrl(req, siteInfo.logoUrl || siteInfo.faviconUrl || '');
      const version = hashBrand(`${siteName}|${description}|${logoUrl}`);
      const manifest = {
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
      res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.json(manifest);
    } catch (error) {
      next(error);
    }
  });

  async function sendIcon(req, res, next, { size, maskable }) {
    try {
      const siteInfo = await loadSiteInfoSafe();
      const logoUrl = resolvePublicUrl(req, siteInfo.logoUrl || siteInfo.faviconUrl || '');
      const buffer = await buildIconBuffer({ logoUrl, size, maskable, fallbackPath });
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  }

  router.get('/icon-192x192.png', (req, res, next) => sendIcon(req, res, next, { size: 192, maskable: false }));
  router.get('/icon-512x512.png', (req, res, next) => sendIcon(req, res, next, { size: 512, maskable: false }));
  router.get('/icon-maskable-512x512.png', (req, res, next) => sendIcon(req, res, next, { size: 512, maskable: true }));
  router.get('/apple-touch-icon.png', (req, res, next) => sendIcon(req, res, next, { size: 180, maskable: true }));

  return router;
}

function registerPwaBrandRoutes(app) {
  const rootRouter = createPwaBrandRouter({ iconBasePath: '/api/pwa' });
  app.get('/manifest.webmanifest', rootRouter.handle.bind(rootRouter));
  app.get('/pwa-192x192.png', (req, res, next) => {
    req.url = '/icon-192x192.png';
    rootRouter.handle(req, res, next);
  });
  app.get('/pwa-512x512.png', (req, res, next) => {
    req.url = '/icon-512x512.png';
    rootRouter.handle(req, res, next);
  });
  app.get('/pwa-maskable-512x512.png', (req, res, next) => {
    req.url = '/icon-maskable-512x512.png';
    rootRouter.handle(req, res, next);
  });
  app.get('/apple-touch-icon.png', (req, res, next) => {
    req.url = '/apple-touch-icon.png';
    rootRouter.handle(req, res, next);
  });
}

module.exports = { createPwaBrandRouter, registerPwaBrandRoutes };

