const { asyncRoute } = require('../../../middleware/asyncRoute');
const themeService = require('../../user/service/theme.service');

exports.updateTheme = asyncRoute(async (req, res) => {
  const data = await themeService.updateThemeConfig(req.body, req.user?.id, req);
  res.success(data, 'Theme config updated');
});

exports.updateThemeSkins = asyncRoute(async (req, res) => {
  const data = await themeService.updateThemeSkins(req.body, req.user?.id, req);
  res.success(data, 'Theme skins updated');
});


