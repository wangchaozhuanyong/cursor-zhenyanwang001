const { asyncRoute } = require('../../../middleware/asyncRoute');
const themeService = require('../../theme/theme.service');

exports.updateTheme = asyncRoute(async (req, res) => {
  const data = await themeService.updateThemeConfig(req.body, req.user?.id, req);
  res.success(data, '主题配置已更新');
});
