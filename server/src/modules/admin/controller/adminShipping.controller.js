const { asyncRoute } = require('../../../middleware/asyncRoute');
const adminExtended = require('../adminExtended.service');
const adminSiteSettingsService = require('../adminSiteSettings.service');

exports.listTemplates = asyncRoute(async (_req, res) => {
  res.success(await adminExtended.listShippingTemplates());
});

exports.createTemplate = asyncRoute(async (req, res) => {
  const r = await adminExtended.createShippingTemplate(req.body, req.user?.id, req);
  if (r.error) return res.fail(r.error.code, r.error.message);
  res.success(r.data, r.message);
});

exports.updateTemplate = asyncRoute(async (req, res) => {
  const r = await adminExtended.updateShippingTemplate(req.params.id, req.body, req.user?.id, req);
  if (r.error) return res.fail(r.error.code, r.error.message);
  res.success(null, r.message);
});

exports.removeTemplate = asyncRoute(async (req, res) => {
  const r = await adminExtended.deleteShippingTemplate(req.params.id, req.user?.id, req);
  if (r.error) return res.fail(r.error.code, r.error.message);
  res.success(null, r.message);
});

exports.getSettings = asyncRoute(async (_req, res) => {
  const r = await adminSiteSettingsService.getShippingSettings();
  res.success(r.data);
});

exports.updateSettings = asyncRoute(async (req, res) => {
  const r = await adminSiteSettingsService.updateShippingSettings(req.body, req.user?.id, req);
  res.success(r.data, r.message);
});
