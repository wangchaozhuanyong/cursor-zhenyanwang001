/**
 * 绔欑偣璁剧疆 / 鍐呭椤?/ 閭€璇疯鍒?/ 绉垎瑙勫垯
 */
const { asyncRoute } = require('../../../middleware/asyncRoute');
const adminSiteSettingsService = require('../service/adminSiteSettings.service');
const adminExtended = require('../service/adminExtended.service');
const multer = require('multer');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

/* 鈹€鈹€ site settings 鈹€鈹€ */
exports.getSite = asyncRoute(async (_req, res) => {
  const r = await adminSiteSettingsService.getSiteSettings();
  res.success(r.data);
});

exports.updateSite = asyncRoute(async (req, res) => {
  const r = await adminSiteSettingsService.updateSiteSettings(req.body, req.user?.id, req);
  res.success(r.data, r.message);
});

exports.uploadSiteAssetMiddleware = upload.single('file');

exports.uploadSiteAsset = asyncRoute(async (req, res) => {
  const key = String(req.params.key || '');
  const r = await adminSiteSettingsService.uploadSiteAsset(req.file, key, req.user?.id, req);
  if (r.error) return res.fail(r.error.code, r.error.message);
  res.success(r.data, r.message);
});

/* 鈹€鈹€ content pages 鈹€鈹€ */
exports.listContent = asyncRoute(async (_req, res) => {
  res.success(await adminExtended.listContentPages());
});

exports.createContent = asyncRoute(async (req, res) => {
  const r = await adminExtended.createContentPage(req.body, req.user?.id, req);
  if (r.error) return res.fail(r.error.code, r.error.message);
  res.success(r.data, r.message);
});

exports.updateContent = asyncRoute(async (req, res) => {
  const r = await adminExtended.updateContentPage(req.params.id, req.body, req.user?.id, req);
  if (r.error) return res.fail(r.error.code, r.error.message);
  res.success(null, r.message);
});

/* 鈹€鈹€ referral rules 鈹€鈹€ */
exports.listReferral = asyncRoute(async (_req, res) => {
  res.success(await adminExtended.listReferralRules());
});

exports.updateReferral = asyncRoute(async (req, res) => {
  const r = await adminExtended.updateReferralRule(req.params.id, req.body, req.user?.id, req);
  if (r.error) return res.fail(r.error.code, r.error.message);
  res.success(null, r.message);
});

/* 鈹€鈹€ points rules 鈹€鈹€ */
exports.listPoints = asyncRoute(async (_req, res) => {
  res.success(await adminExtended.listPointsRules());
});

exports.updatePoints = asyncRoute(async (req, res) => {
  const r = await adminExtended.updatePointsRule(req.params.id, req.body, req.user?.id, req);
  if (r.error) return res.fail(r.error.code, r.error.message);
  res.success(null, r.message);
});

