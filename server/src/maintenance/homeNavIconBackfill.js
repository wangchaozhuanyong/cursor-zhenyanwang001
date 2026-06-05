const path = require('path');

const IMAGE_MIME_BY_EXT = {
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

const IMAGE_URL_RE = /\.(?:avif|gif|jpe?g|png|webp)(?:[?#].*)?$/i;

function normalizeIconUrl(value) {
  return String(value || '').trim();
}

function getUrlPathname(value) {
  const raw = normalizeIconUrl(value);
  if (!raw) return '';
  if (raw.startsWith('/')) return raw.split(/[?#]/)[0];
  try {
    return new URL(raw).pathname;
  } catch {
    return '';
  }
}

function isBackfillableIconUrl(value, { includeExternal = false } = {}) {
  const raw = normalizeIconUrl(value);
  if (!raw || raw.startsWith('data:')) return false;
  if (!IMAGE_URL_RE.test(raw)) return false;
  if (raw.startsWith('/uploads/')) return true;
  try {
    const url = new URL(raw);
    if (!/^https?:$/.test(url.protocol)) return false;
    if (url.pathname.includes('/uploads/')) return true;
    return includeExternal;
  } catch {
    return false;
  }
}

function extractSourceStorageKey(value) {
  const pathname = getUrlPathname(value);
  const match = pathname.match(/\/?(uploads\/.+)$/i);
  return match ? decodeURIComponent(match[1]) : undefined;
}

function inferImageMimeType(value, contentType = '') {
  const normalizedContentType = String(contentType || '').split(';')[0].trim().toLowerCase();
  if (Object.values(IMAGE_MIME_BY_EXT).includes(normalizedContentType)) {
    return normalizedContentType;
  }
  const pathname = getUrlPathname(value);
  const ext = path.extname(pathname).toLowerCase();
  return IMAGE_MIME_BY_EXT[ext] || 'image/webp';
}

function extensionForMimeType(mimeType) {
  const entry = Object.entries(IMAGE_MIME_BY_EXT).find(([, value]) => value === mimeType);
  return entry?.[0] || '.webp';
}

function shouldOptimizeIconImage({ width, height }, { maxEdge = 256 } = {}) {
  const edge = Math.max(Number(width || 0), Number(height || 0));
  return edge > maxEdge;
}

function summarizeBytes(size) {
  const n = Number(size || 0);
  if (!Number.isFinite(n) || n <= 0) return '0B';
  if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(2)}MB`;
  return `${(n / 1024).toFixed(1)}KB`;
}

module.exports = {
  extensionForMimeType,
  extractSourceStorageKey,
  inferImageMimeType,
  isBackfillableIconUrl,
  shouldOptimizeIconImage,
  summarizeBytes,
};
