const { addJob, createWorker } = require('../../../queues');
const engine = require('./consistencyEngine.service');
const repairTaskService = require('./repairTask.service');

let started = false;
let timers = [];

async function enqueueRule(ruleCode, data = {}) {
  return addJob('consistency-scan', 'scan:rule', { ruleCode, ...data });
}

async function enqueueAll(data = {}) {
  return addJob('consistency-scan', 'scan:all', data);
}

async function enqueueAnomalyRescan(anomalyId, data = {}) {
  return addJob('anomaly-rescan', 'rescan:anomaly', { anomalyId, ...data });
}

async function enqueueRepairTask(taskId, data = {}) {
  return addJob('repair-task', 'repair:execute', { taskId, ...data });
}

function startMonitoringScheduler() {
  if (started || process.env.MONITORING_SCHEDULER_DISABLED === '1') return;
  started = true;
  createWorker('consistency-scan', async (job) => {
    if (job.name === 'scan:all') return engine.runAllEnabledRules({ runType: 'scheduled' });
    if (job.name === 'scan:rule') return engine.runRule(job.data.ruleCode, { runType: job.data.runType || 'manual', force: true });
    return null;
  });
  createWorker('anomaly-rescan', async (job) => engine.rescanAnomaly(job.data.anomalyId, job.data));
  createWorker('repair-task', async (job) => repairTaskService.executeRepairTask(job.data.taskId, job.data.operatorId));

  timers.push(setInterval(() => {
    enqueueAll({ runType: 'scheduled_incremental' }).catch(() => {});
  }, 5 * 60 * 1000));
  timers.push(setInterval(() => {
    enqueueAll({ runType: 'scheduled_daily' }).catch(() => {});
  }, 24 * 60 * 60 * 1000));
}

function stopMonitoringScheduler() {
  timers.forEach((timer) => clearInterval(timer));
  timers = [];
  started = false;
}

module.exports = {
  startMonitoringScheduler,
  stopMonitoringScheduler,
  enqueueRule,
  enqueueAll,
  enqueueAnomalyRescan,
  enqueueRepairTask,
};
