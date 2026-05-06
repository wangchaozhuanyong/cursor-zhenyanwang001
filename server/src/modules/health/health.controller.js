const healthService = require('./health.service');
const { ServiceUnavailableError } = require('../../errors');

exports.liveness = (_req, res) => {
  res.success(healthService.getLivenessPayload());
};

exports.readiness = async (_req, res, next) => {
  try {
    const result = await healthService.getReadinessPayload();
    if (result.ok) {
      return res.success(result.data);
    }
    /** 把 503 交由 errorHandler 统一格式化 */
    const err = new ServiceUnavailableError('数据库不可用');
    err.details = result.data;
    throw err;
  } catch (err) {
    return next(err);
  }
};
