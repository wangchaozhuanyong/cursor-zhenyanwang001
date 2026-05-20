const { asyncRoute } = require('../../../middleware/asyncRoute');

function getLogisticsApi() {
  return /** @type {any} */ (require('../../logistics')).api || {};
}

exports.refreshOrderTracking = asyncRoute(async (req, res) => {
  const refresh = getLogisticsApi().refreshOrderTracking;
  if (typeof refresh !== 'function') {
    throw new Error('Logistics 模块 API 未暴露方法：refreshOrderTracking');
  }
  const result = await refresh(req.params.id);
  res.success(result.data, result.message);
});
