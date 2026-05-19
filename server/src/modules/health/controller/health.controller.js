const healthService = require('../service/health.service');
const { ServiceUnavailableError } = require('../../../errors');

exports.liveness = (_req, res) => {
  res.success(healthService.getLivenessPayload());
};

exports.readiness = async (_req, res, next) => {
  try {
    const result = await healthService.getReadinessPayload();
    if (result.ok) {
      return res.success(result.data);
    }
    const err = new ServiceUnavailableError(
      result.data?.database === false ? 'Database not ready' : 'Redis not ready',
    );
    err.details = result.data;
    throw err;
  } catch (err) {
    return next(err);
  }
};
