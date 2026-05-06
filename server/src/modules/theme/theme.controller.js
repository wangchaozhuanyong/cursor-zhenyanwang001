const { asyncRoute } = require('../../middleware/asyncRoute');
const themeService = require('./theme.service');

exports.getActive = asyncRoute(async (_req, res) => {
  const data = await themeService.getActiveThemeConfig();
  res.success(data);
});
