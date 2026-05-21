const engine = require('../service/consistencyEngine.service');

module.exports = async function anomalyRescanJob(job) {
  return engine.rescanAnomaly(job.data.anomalyId, job.data || {});
};
