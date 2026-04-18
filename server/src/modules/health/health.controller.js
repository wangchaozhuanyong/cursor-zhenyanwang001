const healthService = require('./health.service');

exports.liveness = (req, res) => {
  res.success(healthService.getLivenessPayload());
};

exports.readiness = async (req, res) => {
  const result = await healthService.getReadinessPayload();
  if (result.ok) {
    res.success(result.data);
  } else {
    res.fail(503, '数据库不可用', result.data);
  }
};
