const { asyncRoute } = require('../../../middleware/asyncRoute');

function getThemeApi() {
  return /** @type {any} */ (require('../../theme')).api || {};
}

exports.updateTheme = asyncRoute(async (req, res) => {
  const data = await getThemeApi().updateThemeConfig(req.body, req.user?.id, req);
  res.success(data, 'Theme config updated');
});

exports.updateThemeSkins = asyncRoute(async (req, res) => {
  const data = await getThemeApi().updateThemeSkins(req.body, req.user?.id, req);
  res.success(data, 'Theme skins updated');
});
