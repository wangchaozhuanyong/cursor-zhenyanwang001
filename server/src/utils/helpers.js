const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

let ephemeralJwtSecret;

function getJwtSecret() {
  const configured = process.env.JWT_SECRET;
  if (configured) return configured;

  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET is required in production');
  }

  if (!ephemeralJwtSecret) {
    ephemeralJwtSecret = crypto.randomBytes(64).toString('hex');
    console.warn('[WARN] JWT_SECRET 未设置，当前非生产进程将使用临时随机密钥；重启后已签发 token 会失效');
  }
  return ephemeralJwtSecret;
}

function generateId() {
  return crypto.randomUUID();
}

function generateOrderNo() {
  return '#' + Date.now().toString().slice(-8);
}

function generateInviteCode() {
  return crypto.randomBytes(3).toString('hex').toUpperCase();
}

async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

async function comparePassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

/**
 * @param {string} userId
 * @param {number} [refreshVersion=0] 与 users.refresh_token_version 对齐；登出后递增可使旧 refresh 失效
 */
function signToken(userId, refreshVersion = 0, options = {}) {
  const secret = getJwtSecret();
  const expiresIn = /** @type {import('jsonwebtoken').SignOptions['expiresIn']} */ (options.accessExpiresIn || process.env.JWT_EXPIRES_IN || '30m');
  const accessToken = jwt.sign({ userId, ...(options.accessPayload || {}) }, secret, { expiresIn });
  const refreshToken = jwt.sign(
    { userId, type: 'refresh', rv: refreshVersion, ...(options.refreshPayload || {}) },
    secret,
    { expiresIn: '30d' },
  );
  return { accessToken, refreshToken, expiresIn: options.expiresInSeconds || 30 * 60 };
}

function verifyToken(token) {
  return jwt.verify(token, getJwtSecret());
}

function parseBool(val) {
  if (val === undefined || val === null || val === '') return undefined;
  return val === 'true' || val === '1' || val === true;
}

/** 避免 DB 中 images 非合法 JSON 导致整页 /products/home 500 */
function parseProductImages(images) {
  if (images == null || images === '') return [];
  if (Array.isArray(images)) return images;
  if (typeof images === 'string') {
    try {
      const p = JSON.parse(images);
      return Array.isArray(p) ? p : [];
    } catch {
      return [];
    }
  }
  return [];
}

function parseProductImageAlts(value) {
  if (value == null || value === '') return [];
  if (Array.isArray(value)) return value.map((item) => String(item || '').trim());
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map((item) => String(item || '').trim()) : [];
    } catch {
      return [];
    }
  }
  return [];
}

const {
  normalizeLifecycleFromRow,
  statusVarcharFromLifecycle,
} = require('../modules/product/productLifecycle');

function formatProduct(row) {
  if (!row) return null;
  const lifecycleStatus = normalizeLifecycleFromRow(row);
  return {
    id: row.id,
    name: row.name,
    cover_image: row.cover_image,
    cover_image_alt: row.cover_image_alt || '',
    video_url: row.video_url || '',
    images: parseProductImages(row.images),
    image_alts: parseProductImageAlts(row.image_alt_json),
    price: parseFloat(row.price),
    original_price: row.original_price != null ? parseFloat(row.original_price) : null,
    sales_count: row.sales_count != null ? Number(row.sales_count) : 0,
    points: row.points,
    category_id: row.category_id || '',
    stock: row.stock,
    stock_warning_threshold: row.stock_warning_threshold == null ? undefined : Number(row.stock_warning_threshold),
    stock_lower_limit: row.stock_lower_limit == null ? null : Number(row.stock_lower_limit),
    stock_upper_limit: row.stock_upper_limit == null ? null : Number(row.stock_upper_limit),
    lifecycle_status: lifecycleStatus,
    status: statusVarcharFromLifecycle(lifecycleStatus),
    sort_order: row.sort_order,
    created_at: row.created_at,
    createdAt: row.created_at,
    published_at: row.published_at || row.created_at,
    publishedAt: row.published_at || row.created_at,
    description: row.description || '',
    is_recommended: !!row.is_recommended,
    is_new: !!row.is_new,
    isNewArrival: !!row.is_new,
    newArrival: !!row.is_new,
    is_hot: !!row.is_hot,
    is_age_restricted: row.is_age_restricted === undefined ? undefined : !!row.is_age_restricted,
    minimum_age: row.minimum_age == null ? null : Number(row.minimum_age),
    compliance_type: row.compliance_type || null,
    region_notice: row.region_notice || null,
    compliance_notice: row.compliance_notice || null,
    allow_index: row.allow_index === undefined ? undefined : Number(row.allow_index),
  };
}

function hasInlineDataUrl(value) {
  if (typeof value !== 'string') return false;
  return /^\s*data:/i.test(value) || /data:image\//i.test(value);
}

function omitInlineDataUrl(value) {
  return hasInlineDataUrl(value) ? '' : value;
}

function resolveStockStatus(stock) {
  const n = Number(stock || 0);
  if (n <= 0) return 'out_of_stock';
  if (n <= 5) return 'low_stock';
  return 'in_stock';
}

function formatProductCard(row) {
  if (!row) return null;
  const lifecycleStatus = normalizeLifecycleFromRow(row);
  const stock = Number(row.stock || 0);
  return {
    id: row.id,
    name: row.name,
    slug: row.slug || row.id,
    cover_image: omitInlineDataUrl(row.cover_image || ''),
    cover_image_alt: row.cover_image_alt || '',
    price: row.price == null ? 0 : parseFloat(row.price),
    original_price: row.original_price != null ? parseFloat(row.original_price) : null,
    min_price: row.min_price == null ? undefined : Number(row.min_price),
    max_price: row.max_price == null ? undefined : Number(row.max_price),
    min_original_price: row.min_original_price == null ? null : Number(row.min_original_price),
    max_original_price: row.max_original_price == null ? null : Number(row.max_original_price),
    variant_count: row.variant_count == null ? undefined : Number(row.variant_count),
    sales_count: row.sales_count != null ? Number(row.sales_count) : 0,
    points: row.points == null ? 0 : Number(row.points),
    category_id: row.category_id || '',
    category_name: row.category_name || '',
    stock,
    stock_status: row.stock_status || resolveStockStatus(stock),
    lifecycle_status: lifecycleStatus,
    status: statusVarcharFromLifecycle(lifecycleStatus),
    sort_order: row.sort_order,
    created_at: row.created_at,
    createdAt: row.created_at,
    published_at: row.published_at || row.created_at,
    publishedAt: row.published_at || row.created_at,
    is_recommended: !!row.is_recommended,
    is_new: !!row.is_new,
    isNewArrival: !!row.is_new,
    newArrival: !!row.is_new,
    is_hot: !!row.is_hot,
  };
}

module.exports = {
  generateId, generateOrderNo, generateInviteCode,
  hashPassword, comparePassword,
  signToken, verifyToken,
  parseBool, parseProductImages, parseProductImageAlts, formatProduct, formatProductCard,
  hasInlineDataUrl, omitInlineDataUrl,
};
