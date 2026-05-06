/**
 * 站点设置 / 内容页 / 邀请规则 / 积分规则
 */
const { asyncRoute } = require('../../../middleware/asyncRoute');
const adminSiteSettingsService = require('../adminSiteSettings.service');
const adminExtended = require('../adminExtended.service');

/* ── site settings ── */
exports.getSite = asyncRoute(async (_req, res) => {
  const r = await adminSiteSettingsService.getSiteSettings();
  res.success(r.data);
});

exports.updateSite = asyncRoute(async (req, res) => {
  const r = await adminSiteSettingsService.updateSiteSettings(req.body, req.user?.id, req);
  res.success(r.data, r.message);
});

/* ── content pages ── */
exports.listContent = asyncRoute(async (_req, res) => {
  res.success(await adminExtended.listContentPages());
});

exports.updateContent = asyncRoute(async (req, res) => {
  const r = await adminExtended.updateContentPage(req.params.id, req.body, req.user?.id, req);
  if (r.error) return res.fail(r.error.code, r.error.message);
  res.success(null, r.message);
});

/* ── referral rules ── */
exports.listReferral = asyncRoute(async (_req, res) => {
  res.success(await adminExtended.listReferralRules());
});

exports.updateReferral = asyncRoute(async (req, res) => {
  const r = await adminExtended.updateReferralRule(req.params.id, req.body, req.user?.id, req);
  if (r.error) return res.fail(r.error.code, r.error.message);
  res.success(null, r.message);
});

/* ── points rules ── */
exports.listPoints = asyncRoute(async (_req, res) => {
  res.success(await adminExtended.listPointsRules());
});

exports.updatePoints = asyncRoute(async (req, res) => {
  const r = await adminExtended.updatePointsRule(req.params.id, req.body, req.user?.id, req);
  if (r.error) return res.fail(r.error.code, r.error.message);
  res.success(null, r.message);
});
