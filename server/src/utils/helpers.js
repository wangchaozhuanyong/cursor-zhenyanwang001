const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

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
function signToken(userId, refreshVersion = 0) {
  const secret = process.env.JWT_SECRET || 'change_me';
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  const accessToken = jwt.sign({ userId }, secret, { expiresIn });
  const refreshToken = jwt.sign(
    { userId, type: 'refresh', rv: refreshVersion },
    secret,
    { expiresIn: '30d' },
  );
  return { accessToken, refreshToken, expiresIn: 7 * 24 * 3600 };
}

function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET || 'change_me');
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

function formatProduct(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    cover_image: row.cover_image,
    images: parseProductImages(row.images),
    price: parseFloat(row.price),
    original_price: row.original_price != null ? parseFloat(row.original_price) : null,
    sales_count: row.sales_count != null ? Number(row.sales_count) : 0,
    points: row.points,
    category_id: row.category_id || '',
    stock: row.stock,
    status: row.status,
    sort_order: row.sort_order,
    description: row.description || '',
    is_recommended: !!row.is_recommended,
    is_new: !!row.is_new,
    is_hot: !!row.is_hot,
  };
}

module.exports = {
  generateId, generateOrderNo, generateInviteCode,
  hashPassword, comparePassword,
  signToken, verifyToken,
  parseBool, formatProduct,
};
