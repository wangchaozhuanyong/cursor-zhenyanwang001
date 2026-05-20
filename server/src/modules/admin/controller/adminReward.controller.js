const { asyncRoute } = require('../../../middleware/asyncRoute');

function getUserApi() {
  return /** @type {any} */ (require('../../user')).api || {};
}

exports.listRecords = asyncRoute(async (req, res) => {
  const data = await getUserApi().getAdminRewardRecords(req.query);
  res.success(data);
});


