const { asyncRoute } = require('../../../middleware/asyncRoute');
const themeService = require('../service/theme.service');

exports.getActive = asyncRoute(async (_req, res) => {
  const data = await themeService.getActiveThemeConfig();
  res.set('Cache-Control', 'no-store, max-age=0, must-revalidate');
  res.success(data);
});

exports.getSkins = asyncRoute(async (_req, res) => {
  const data = await themeService.getThemeSkins();
  res.set('Cache-Control', 'no-store, max-age=0, must-revalidate');
  res.success(data);
});

exports.getPreviewDraft = asyncRoute(async (req, res) => {
  const data = await themeService.getThemePreviewDraft(req.params.draftToken);
  res.set('Cache-Control', 'no-store, max-age=0, must-revalidate');
  res.success(data);
});
