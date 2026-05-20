const { asyncRoute } = require('../../../middleware/asyncRoute');

function getUserApi() {
  return /** @type {any} */ (require('../../user')).api || {};
}

exports.updateTheme = asyncRoute(async (req, res) => {
  const data = await getUserApi().updateThemeConfig(req.body, req.user?.id, req);
  res.success(data, 'Theme config updated');
});

exports.updateThemeSkins = asyncRoute(async (req, res) => {
  const data = await getUserApi().updateThemeSkins(req.body, req.user?.id, req);
  res.success(data, 'Theme skins updated');
});


