const { addJob, createWorker } = require('../../../queues');
const repo = require('../repository/monitoring.repository');
const cronMatcher = require('./cronMatcher.service');
const engine = require('./consistencyEngine.service');
const repairTaskService = require('./repairTask.service');

let started = false;
let timers = [];
let rulesCache = [];
let rulesCacheAt = 0;
const RULES_CACHE_MS = 5 * 60 * 1000;
const lastTriggered = new Map();

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

function minuteKey(date) {
  const d = date instanceof Date ? date : new Date(date);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}-${d.getHours()}:${d.getMinutes()}`;
}

async function refreshRulesCache(force = false) {
  const now = Date.now();
  if (!force && rulesCache.length && now - rulesCacheAt < RULES_CACHE_MS) return rulesCache;
  rulesCache = await repo.listEnabledRules();
  rulesCacheAt = now;
  return rulesCache;
}

function reloadRulesCache() {
  rulesCacheAt = 0;
  rulesCache = [];
}

async function tickScheduledRules() {
  const rules = await refreshRulesCache();
  const now = new Date();
  const key = minuteKey(now);

  for (const rule of rules) {
    if (!rule.schedule_cron || !cronMatcher.matches(rule.schedule_cron, now)) continue;
    if (lastTriggered.get(rule.code) === key) continue;
    lastTriggered.set(rule.code, key);
    await enqueueRule(rule.code, { runType: 'scheduled_cron', force: false });
  }
}

async function tickScheduledRulesInline() {
  const rules = await refreshRulesCache();
  const now = new Date();
  const key = minuteKey(now);

  for (const rule of rules) {
    if (!rule.schedule_cron || !cronMatcher.matches(rule.schedule_cron, now)) continue;
    if (lastTriggered.get(rule.code) === key) continue;
    lastTriggered.set(rule.code, key);
    try {
      await engine.runRule(rule.code, { runType: 'scheduled_cron', force: false });
    } catch (error) {
      console.warn(`[monitoringScheduler] inline rule ${rule.code} failed:`, error?.message || error);
    }
  }
}

/** 无 Redis 时直接执行规则（适合本地开发；生产建议配置 Redis） */
function startMonitoringSchedulerInline() {
  if (started || process.env.MONITORING_SCHEDULER_DISABLED === '1') return;
  started = true;

  timers.push(setInterval(() => {
    tickScheduledRulesInline().catch((error) => {
      console.warn('[monitoringScheduler] inline cron tick failed:', error?.message || error);
    });
  }, 60 * 1000));

  setTimeout(() => {
    refreshRulesCache(true)
      .then(() => tickScheduledRulesInline())
      .catch((error) => {
        console.warn('[monitoringScheduler] inline initial cron tick failed:', error?.message || error);
      });
  }, 5000);
}

function startMonitoringScheduler() {
  if (started || process.env.MONITORING_SCHEDULER_DISABLED === '1') return;
  started = true;
  createWorker('consistency-scan', async (job) => {
    if (job.name === 'scan:all') return engine.runAllEnabledRules({ runType: 'scheduled' });
    if (job.name === 'scan:rule') {
      return engine.runRule(job.data.ruleCode, {
        runType: job.data.runType || 'manual',
        force: Boolean(job.data.force),
        operatorId: job.data.operatorId || null,
      });
    }
    return null;
  });
  createWorker('anomaly-rescan', async (job) => engine.rescanAnomaly(job.data.anomalyId, job.data));
  createWorker('repair-task', async (job) => repairTaskService.executeRepairTask(job.data.taskId, job.data.operatorId));

  timers.push(setInterval(() => {
    tickScheduledRules().catch((error) => {
      console.warn('[monitoringScheduler] cron tick failed:', error?.message || error);
    });
  }, 60 * 1000));

  setTimeout(() => {
    refreshRulesCache(true)
      .then(() => tickScheduledRules())
      .catch((error) => {
        console.warn('[monitoringScheduler] initial cron tick failed:', error?.message || error);
      });
  }, 5000);
}

function stopMonitoringScheduler() {
  timers.forEach((timer) => clearInterval(timer));
  timers = [];
  started = false;
  reloadRulesCache();
  lastTriggered.clear();
}

module.exports = {
  startMonitoringScheduler,
  startMonitoringSchedulerInline,
  stopMonitoringScheduler,
  enqueueRule,
  enqueueAll,
  enqueueAnomalyRescan,
  enqueueRepairTask,
  reloadRulesCache,
  tickScheduledRules,
};
