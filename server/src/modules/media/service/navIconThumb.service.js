const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const {
  buildStorageKey,
  getS3ObjectBuffer,
  isS3StorageEnabled,
} = require('../../../utils/objectStorage');

const SERVER_ROOT = path.join(__dirname, '../../../../');
const PUBLIC_ROOT = path.join(SERVER_ROOT, 'public');
const UPLOADS_ROOT = path.join(PUBLIC_ROOT, 'uploads');
const DEFAULT_CACHE_DIR = path.join(PUBLIC_ROOT, 'thumb-cache', 'nav-icons');
const DEFAULT_SIZE = 128;
const DEFAULT_QUALITY = 80;
const DEFAULT_TIMEOUT_MS = 8000;
const MAX_SOURCE_BYTES = 5 * 1024 * 1024;
const IMAGE_PATH_RE = /\.(?:avif|gif|jpe?g|png|webp)$/i;

function normalizeHostname(value) {
  return String(value || '').trim().toLowerCase();
}

function addHostnameFromUrl(hosts, value) {
  const raw = String(value || '').trim();
  if (!raw) return;
  try {
    const normalized = raw.startsWith('http') ? raw : `https://${raw}`;
    const { hostname } = new URL(normalized);
    if (hostname) hosts.add(normalizeHostname(hostname));
  } catch {
    // Ignore invalid env values.
  }
}

function getAllowedImageHosts(options = {}) {
  const hosts = new Set(['cdn.damatong.net', 'damatong.net', 'www.damatong.net']);
  addHostnameFromUrl(hosts, process.env.PUBLIC_APP_URL);
  addHostnameFromUrl(hosts, process.env.STORAGE_PUBLIC_BASE_URL);
  addHostnameFromUrl(hosts, options.requestHost);

  if (process.env.NODE_ENV !== 'production') {
    hosts.add('localhost');
    hosts.add('127.0.0.1');
  }

  return hosts;
}

function getSourcePathname(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (raw.startsWith('/')) return raw.split(/[?#]/)[0];
  try {
    return new URL(raw).pathname;
  } catch {
    return '';
  }
}

function isUploadImagePathname(pathname) {
  const normalized = String(pathname || '').trim();
  if (!normalized || normalized.includes('..')) return false;
  if (!normalized.includes('/uploads/')) return false;
  return IMAGE_PATH_RE.test(normalized);
}

function isNavIconThumbSourceAllowed(value, options = {}) {
  const raw = String(value || '').trim();
  if (!raw || raw.startsWith('data:') || raw.startsWith('blob:')) return false;

  if (raw.startsWith('/')) {
    return raw.startsWith('/uploads/') && isUploadImagePathname(getSourcePathname(raw));
  }

  let url;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }

  if (!['http:', 'https:'].includes(url.protocol)) return false;
  if (!isUploadImagePathname(url.pathname)) return false;

  const allowedHosts = getAllowedImageHosts(options);
  return allowedHosts.has(normalizeHostname(url.hostname));
}

function buildNavIconThumbCacheKey(source, options = {}) {
  const width = Number(options.width || DEFAULT_SIZE);
  const quality = Number(options.quality || DEFAULT_QUALITY);
  return crypto
    .createHash('sha256')
    .update(`${String(source || '').trim()}|${width}|${quality}`)
    .digest('hex')
    .slice(0, 40);
}

function resolveLocalUploadPath(source) {
  const raw = String(source || '').trim();
  if (!raw.startsWith('/uploads/')) return '';
  const pathname = getSourcePathname(raw);
  if (!isUploadImagePathname(pathname)) return '';

  let decoded;
  try {
    decoded = decodeURIComponent(pathname.replace(/^\//, ''));
  } catch {
    return '';
  }

  const resolved = path.resolve(PUBLIC_ROOT, decoded);
  const uploadsRoot = path.resolve(UPLOADS_ROOT);
  if (!resolved.startsWith(uploadsRoot + path.sep) && resolved !== uploadsRoot) return '';
  return resolved;
}

function extractStorageKeyFromSource(source) {
  const raw = String(source || '').trim();
  const publicBaseUrl = String(process.env.STORAGE_PUBLIC_BASE_URL || '').trim().replace(/\/+$/, '');

  if (raw.startsWith('/uploads/')) {
    return buildStorageKey(raw.replace(/^\//, ''));
  }

  try {
    if (publicBaseUrl && raw.startsWith(`${publicBaseUrl}/`)) {
      return decodeURIComponent(raw.slice(publicBaseUrl.length + 1).split(/[?#]/)[0]);
    }

    const url = new URL(raw);
    const pathname = decodeURIComponent(url.pathname.replace(/^\/+/, ''));
    const uploadIndex = pathname.toLowerCase().lastIndexOf('uploads/');
    if (uploadIndex >= 0) return pathname.slice(0, uploadIndex) + pathname.slice(uploadIndex);
  } catch {
    // Ignore invalid URLs.
  }

  return '';
}

async function fetchRemoteImage(source, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Number(options.timeoutMs || DEFAULT_TIMEOUT_MS));
  const referer = String(process.env.PUBLIC_APP_URL || 'https://damatong.net/').trim();

  try {
    const response = await fetch(source, {
      signal: controller.signal,
      headers: {
        Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        Referer: referer,
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36',
      },
    });
    if (!response.ok) {
      const error = new Error(`Image download failed with HTTP ${response.status}`);
      error.statusCode = response.status;
      throw error;
    }

    const contentType = String(response.headers.get('content-type') || '').toLowerCase();
    if (contentType && !contentType.startsWith('image/')) {
      const error = new Error('Remote source is not an image');
      error.statusCode = 415;
      throw error;
    }

    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_SOURCE_BYTES) {
      const error = new Error('Remote image is too large for nav icon thumbnailing');
      error.statusCode = 413;
      throw error;
    }

    return Buffer.from(arrayBuffer);
  } finally {
    clearTimeout(timer);
  }
}

async function loadSourceImage(source, options = {}) {
  const localPath = resolveLocalUploadPath(source);
  if (localPath && fs.existsSync(localPath)) {
    const stat = await fs.promises.stat(localPath);
    if (stat.size > MAX_SOURCE_BYTES) {
      const error = new Error('Local image is too large for nav icon thumbnailing');
      error.statusCode = 413;
      throw error;
    }
    return fs.promises.readFile(localPath);
  }

  if (isS3StorageEnabled()) {
    const storageKey = extractStorageKeyFromSource(source);
    if (storageKey) {
      try {
        const buffer = await getS3ObjectBuffer(storageKey);
        if (buffer.length > MAX_SOURCE_BYTES) {
          const error = new Error('Stored image is too large for nav icon thumbnailing');
          error.statusCode = 413;
          throw error;
        }
        return buffer;
      } catch (error) {
        if (Number(error.statusCode || 0) === 413) throw error;
      }
    }
  }

  if (!/^https?:\/\//i.test(source)) {
    const error = new Error('Relative source image is not available locally');
    error.statusCode = 404;
    throw error;
  }

  return fetchRemoteImage(source, options);
}

async function getOrCreateNavIconThumb(source, options = {}) {
  if (!isNavIconThumbSourceAllowed(source, options)) {
    const error = new Error('Nav icon source is not allowed');
    error.statusCode = 400;
    throw error;
  }

  const width = Math.max(48, Math.min(256, Number(options.width || DEFAULT_SIZE)));
  const quality = Math.max(50, Math.min(90, Number(options.quality || DEFAULT_QUALITY)));
  const cacheDir = options.cacheDir || DEFAULT_CACHE_DIR;
  const cacheKey = buildNavIconThumbCacheKey(source, { width, quality });
  const filePath = path.join(cacheDir, `${cacheKey}.webp`);

  if (fs.existsSync(filePath)) {
    return { filePath, cacheHit: true };
  }

  await fs.promises.mkdir(cacheDir, { recursive: true });
  const input = await loadSourceImage(source, options);
  const output = await sharp(input)
    .rotate()
    .resize({
      width,
      height: width,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality, effort: 4 })
    .toBuffer();

  const tempPath = path.join(cacheDir, `${cacheKey}.${crypto.randomUUID()}.tmp`);
  await fs.promises.writeFile(tempPath, output);
  await fs.promises.rename(tempPath, filePath).catch(async (error) => {
    await fs.promises.rm(tempPath, { force: true }).catch(() => {});
    if (fs.existsSync(filePath)) return;
    throw error;
  });

  return { filePath, cacheHit: false, sizeBytes: output.length };
}

module.exports = {
  DEFAULT_CACHE_DIR,
  buildNavIconThumbCacheKey,
  extractStorageKeyFromSource,
  getAllowedImageHosts,
  getOrCreateNavIconThumb,
  getSourcePathname,
  isNavIconThumbSourceAllowed,
  isUploadImagePathname,
  resolveLocalUploadPath,
};
