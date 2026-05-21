const engine = require('../service/consistencyEngine.service');

module.exports = async function consistencyScanJob(job) {
  if (job.name === 'scan:all') return engine.runAllEnabledRules(job.data || {});
  if (job.name === 'scan:rule') return engine.runRule(job.data.ruleCode, job.data || {});
  return null;
};
