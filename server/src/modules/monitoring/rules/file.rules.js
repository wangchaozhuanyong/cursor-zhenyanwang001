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

function extractHtmlImagePaths(value) {
  const text = String(value || '');
  const out = [];
  for (const match of text.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)) {
    out.push(match[1]);
  }
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
  let checkedCount = 0;
  const refs = await repo.selectFileReferenceRows();
  async function checkRef(entityType, entityId, title, paths, extra = {}) {
    for (const filePath of paths) {
      checkedCount += 1;
      if (!(await objectPathExists(filePath))) rows.push({ entityType, entityId, title, filePath, ...extra });
    }
  }
  for (const product of refs.products || []) {
    await checkRef('product', product.id, product.name, [...extractPaths(product.cover_image), ...extractPaths(product.images)]);
  }
  for (const variant of refs.variants || []) {
    await checkRef('product_variant', variant.id, variant.title, extractPaths(variant.image_url), { productId: variant.product_id });
  }
  for (const banner of refs.banners || []) {
    await checkRef('banner', banner.id, banner.title, extractPaths(banner.image));
  }
  for (const user of refs.users || []) {
    await checkRef('user', user.id, user.nickname || user.phone || user.id, extractPaths(user.avatar));
  }
  for (const category of refs.categories || []) {
    await checkRef('category', category.id, category.name || category.id, extractPaths(category.icon_url));
  }
  for (const setting of refs.siteSettings || []) {
    if (!['logoUrl', 'faviconUrl', 'ogImage'].includes(String(setting.setting_key || ''))) continue;
    await checkRef('site_setting', setting.setting_key, setting.setting_key, extractPaths(setting.value));
  }
  for (const item of refs.homeNav || []) {
    await checkRef('home_nav', item.id, item.title || item.id, extractPaths(item.icon_url));
  }
  for (const activity of refs.marketingActivities || []) {
    await checkRef('marketing_activity', activity.id, activity.title || activity.id, extractPaths(activity.cover_image));
  }
  for (const gift of refs.pointsGifts || []) {
    await checkRef('points_gift', gift.id, gift.name || gift.id, extractPaths(gift.image));
  }
  for (const page of refs.contentPages || []) {
    await checkRef('content_page', page.id, page.title || page.id, [...extractPaths(page.content), ...extractHtmlImagePaths(page.content)]);
  }
  for (const item of refs.orderItems || []) {
    await checkRef('order_item', item.id, item.order_id || item.id, [...extractPaths(item.product_image_snapshot), ...extractPaths(item.variant_image_snapshot)]);
  }
  for (const task of refs.exportTasks || []) {
    await checkRef('export_task', task.id, task.id, extractPaths(task.file_path));
  }
  for (const notification of refs.notifications || []) {
    await checkRef('notification', notification.id, notification.title || notification.id, [
      ...extractPaths(notification.image_url),
      ...extractPaths(notification.attachment_url),
      ...extractPaths(notification.attachments),
    ]);
  }
  return {
    checkedCount,
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
