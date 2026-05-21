const repairTaskService = require('../service/repairTask.service');

module.exports = async function repairTaskJob(job) {
  return repairTaskService.executeRepairTask(job.data.taskId, job.data.operatorId);
};
