const { asyncRoute } = require('../../../middleware/asyncRoute');

function getThemeApi() {
  return /** @type {any} */ (require('../../theme/publicApi')) || {};
}

exports.retiredThemeWrite = asyncRoute(async (_req, res) => {
  res.status(410).json({
    success: false,
    code: 'THEME_STUDIO_RETIRED',
    message: '客户端已切换为固定设计，皮肤编辑功能已停用。',
  });
});

exports.updateTheme = asyncRoute(async (req, res) => {
  const data = await getThemeApi().updateThemeConfig(req.body, req.user?.id, req);
  res.success(data, 'Theme config updated');
});

exports.updateThemeSkins = asyncRoute(async (req, res) => {
  const data = await getThemeApi().updateThemeSkins(req.body, req.user?.id, req);
  res.success(data, 'Theme skins updated');
});

exports.getThemeSkins = asyncRoute(async (_req, res) => {
  const data = await getThemeApi().getThemeSkins();
  res.success(data, 'Fixed storefront design loaded');
});

exports.saveThemeSkinDraft = asyncRoute(async (req, res) => {
  const data = await getThemeApi().saveThemeSkinDraft(req.params.themeKey, req.body, req.user?.id, req);
  res.success(data, 'Theme skin draft saved');
});

exports.createThemePreviewDraft = asyncRoute(async (req, res) => {
  const data = await getThemeApi().createThemePreviewDraft(req.params.themeKey, req.body, req.user?.id);
  res.success(data, 'Theme preview draft created');
});

exports.publishThemeSkin = asyncRoute(async (req, res) => {
  const data = await getThemeApi().publishThemeSkin(req.params.themeKey, req.body, req.user?.id, req);
  res.success(data, 'Theme skin published');
});

exports.disableThemeSkin = asyncRoute(async (req, res) => {
  const data = await getThemeApi().disableThemeSkin(req.params.themeKey, req.user?.id, req);
  res.success(data, 'Theme skin disabled');
});
