const fs = require('fs');
const path = require('path');
const repo = require('../repository/monitoring.repository');
const {
  buildStorageKey,
  headS3Object,
  isS3StorageEnabled,
  isTrustedPublicAssetUrl,
} = require('../../../utils/objectStorage');

function extractPaths(value) {
  const out = [];
  if (!value) return out;
  if (Array.isArray(value)) {
    value.forEach((item) => out.push(...extractPaths(item)));
    return out;
  }
  if (typeof value === 'object') {
    Object.values(value).forEach((item) => out.push(...extractPaths(item)));
    return out;
  }
  const text = String(value).trim();
  if (!text) return out;
  if (/^https?:\/\//i.test(text)) return out;
  if (/\.(png|jpe?g|webp|gif|svg|mp4|mov|pdf)$/i.test(text)) out.push(text);
  return out;
}

async function storagePathExists(urlPath) {
  if (!urlPath || /^https?:\/\//i.test(urlPath) || urlPath.startsWith('data:')) return true;
  if (isS3StorageEnabled()) {
    const rel = decodeURIComponent(urlPath).replace(/^\/+/, '');
    try {
      await headS3Object(rel);
      return true;
    } catch {}
    try {
      await headS3Object(buildStorageKey(rel));
      return true;
    } catch {
      return false;
    }
  }
  const rel = decodeURIComponent(urlPath).replace(/^\/+/, '');
  const candidates = [
    path.join(__dirname, '../../../public', rel),
    path.join(__dirname, '../../../public/uploads', rel.replace(/^uploads[\\/]/, '')),
  ];
  return candidates.some((p) => fs.existsSync(p));
}

async function objectPathExists(urlPath) {
  if (!urlPath || urlPath.startsWith('data:')) return true;
  if (!/^https?:\/\//i.test(urlPath)) return storagePathExists(urlPath);
  if (!isS3StorageEnabled() || !isTrustedPublicAssetUrl(urlPath)) return true;
  try {
    const key = decodeURIComponent(new URL(urlPath).pathname).replace(/^\/+/, '');
    return storagePathExists(key);
  } catch {
    return true;
  }
}

async function fileObjectMissing() {
  const rows = [];
  const { products, variants, banners } = await repo.selectFileReferenceRows();
  for (const product of products) {
    const paths = [...extractPaths(product.cover_image), ...extractPaths(product.images)];
    for (const filePath of paths) {
      if (!(await objectPathExists(filePath))) rows.push({ entityType: 'product', entityId: product.id, title: product.name, filePath });
    }
  }
  for (const variant of variants) {
    for (const filePath of extractPaths(variant.image_url)) {
      if (!(await objectPathExists(filePath))) rows.push({ entityType: 'product_variant', entityId: variant.id, title: variant.title, filePath, productId: variant.product_id });
    }
  }
  for (const banner of banners) {
    for (const filePath of extractPaths(banner.image)) {
      if (!(await objectPathExists(filePath))) rows.push({ entityType: 'banner', entityId: banner.id, title: banner.title, filePath });
    }
  }
  return {
    checkedCount: rows.length,
    anomalies: rows.map((row) => ({
      ruleCode: 'FILE_OBJECT_MISSING',
      module: 'file',
      severity: 'P2',
      entityType: row.entityType,
      entityId: row.entityId,
      title: `文件对象不存在：${row.title || row.entityId}`,
      expectedValue: { exists: true },
      actualValue: { exists: false, path: row.filePath },
      diffValue: { missingPath: row.filePath },
      evidence: row,
      rootCauseCode: 'FILE_OBJECT_MISSING',
      rootCauseMessage: '数据库引用了文件路径，但本地存储未找到该文件。',
      autoFixable: false,
      repairSuggestion: { repairType: 'manual_file_reupload', description: '请重新上传文件或替换业务图片路径。' },
    })),
  };
}

module.exports = { FILE_OBJECT_MISSING: fileObjectMissing };
