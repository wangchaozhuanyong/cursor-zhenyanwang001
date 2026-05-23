const repo = require('../repository/monitoring.repository');

async function getOverview() {
  return repo.getOverview();
}

async function listAnomalies(query) {
  return repo.listAnomalies(query);
}

async function getAnomalyDetail(id) {
  const anomaly = await repo.findAnomalyById(id);
  if (!anomaly) return null;
  const [changeEvents, repairTasks, runs] = await Promise.all([
    repo.listDataChangeEvents(anomaly.entity_type, anomaly.entity_id, 20),
    repo.listRepairTasks({ anomalyId: anomaly.id, pageSize: 20 }),
    repo.listRuns({ ruleCode: anomaly.rule_code, pageSize: 20 }),
  ]);
  return {
    anomaly,
    changeEvents,
    repairTasks: repairTasks.list,
    runs: runs.list,
  };
}

async function markAnomalyStatus(id, status, operatorId, remark = '') {
  const anomaly = await repo.markAnomalyStatus(id, status, operatorId);
  if (!anomaly) return null;
  await repo.recordRuleEvent(anomaly.rule_code, `anomaly.${status}`, {
    anomalyId: anomaly.id,
    operatorId,
    remark,
  });
  return anomaly;
}

async function listRepairTasks(query) {
  return repo.listRepairTasks(query);
}

async function listRules() {
  return repo.listRules();
}

async function updateRule(code, patch) {
  return repo.updateRule(code, patch);
}

async function listRuns(query) {
  return repo.listRuns(query);
}

module.exports = {
  getOverview,
  listAnomalies,
  getAnomalyDetail,
  markAnomalyStatus,
  listRepairTasks,
  listRules,
  updateRule,
  listRuns,
};
