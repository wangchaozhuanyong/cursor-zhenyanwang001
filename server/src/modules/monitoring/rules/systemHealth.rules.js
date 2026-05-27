const fs = require('fs');
const repo = require('../repository/monitoring.repository');

function systemAnomaly(ruleCode, severity, title, evidence = {}) {
  return {
    ruleCode,
    module: ruleCode.startsWith('BACKUP') ? 'backup' : 'system',
    severity,
    entityType: 'system_health',
    entityId: ruleCode,
    title,
    expectedValue: evidence.expectedValue ?? { ok: true },
    actualValue: evidence.actualValue ?? { ok: false },
    diffValue: evidence.diffValue ?? null,
    evidence,
    rootCauseCode: ruleCode,
    rootCauseMessage: evidence.message || title,
    autoFixable: false,
    repairSuggestion: { repairType: 'manual_system_check', description: '请检查系统依赖、任务日志和基础设施监控。' },
  };
}

function ok() {
  return { checkedCount: 1, anomalies: [] };
}

async function dbConnectionUnhealthy() {
  try {
    await repo.db.query('SELECT 1');
    return ok();
  } catch (error) {
    return { checkedCount: 1, anomalies: [systemAnomaly('DB_CONNECTION_UNHEALTHY', 'P0', '数据库连接异常', { message: error.message })] };
  }
}

async function redisUnhealthy() {
  try {
    const { pingRedis } = require('../../../config/redis');
    const result = await pingRedis();
    return result.ok ? ok() : { checkedCount: 1, anomalies: [systemAnomaly('REDIS_UNHEALTHY', 'P1', 'Redis 异常', result)] };
  } catch (error) {
    return { checkedCount: 1, anomalies: [systemAnomaly('REDIS_UNHEALTHY', 'P1', 'Redis 异常', { message: error.message })] };
  }
}

async function queueCounts() {
  const { getQueue } = require('../../../queues');
  const queueNames = ['consistency-scan', 'anomaly-rescan', 'repair-task'];
  const rows = [];
  for (const name of queueNames) {
    const queue = getQueue(name);
    const counts = await queue.getJobCounts('waiting', 'delayed', 'failed').catch((error) => ({ error: error.message }));
    rows.push({ name, ...counts });
  }
  return rows;
}

async function bullmqBacklogHigh() {
  const rows = await queueCounts();
  const threshold = Number(process.env.MONITORING_QUEUE_BACKLOG_THRESHOLD || 1000);
  const bad = rows.filter((row) => Number(row.waiting || 0) + Number(row.delayed || 0) > threshold);
  return { checkedCount: rows.length, anomalies: bad.map((row) => systemAnomaly('BULLMQ_QUEUE_BACKLOG_HIGH', 'P1', `队列积压过高：${row.name}`, { ...row, threshold })) };
}

async function bullmqFailedJobsHigh() {
  const rows = await queueCounts();
  const threshold = Number(process.env.MONITORING_QUEUE_FAILED_THRESHOLD || 100);
  const bad = rows.filter((row) => Number(row.failed || 0) > threshold);
  return { checkedCount: rows.length, anomalies: bad.map((row) => systemAnomaly('BULLMQ_FAILED_JOBS_HIGH', 'P1', `队列失败任务过多：${row.name}`, { ...row, threshold })) };
}

async function schedulerNotRunning() {
  if (!(await repo.tableExists('data_consistency_runs'))) return ok();
  const [[row]] = await repo.db.query(`SELECT MAX(started_at) AS last_started_at FROM data_consistency_runs WHERE run_type LIKE 'scheduled%'`);
  const last = row?.last_started_at ? new Date(row.last_started_at).getTime() : 0;
  const staleMs = Number(process.env.MONITORING_SCHEDULER_STALE_MS || 15 * 60 * 1000);
  const stale = !last || Date.now() - last > staleMs;
  return {
    checkedCount: 1,
    anomalies: stale ? [systemAnomaly('SCHEDULER_NOT_RUNNING', 'P1', '监控调度器未运行', { lastStartedAt: row?.last_started_at || null, staleMs })] : [],
  };
}

async function apiErrorRateHigh() {
  if (!(await repo.tableExists('audit_logs'))) return ok();
  const [[row]] = await repo.db.query(
    `SELECT COUNT(*) AS total,
            SUM(CASE WHEN result = 'failure' THEN 1 ELSE 0 END) AS failed
       FROM audit_logs
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 15 MINUTE)`,
  );
  const total = Number(row?.total || 0);
  const failed = Number(row?.failed || 0);
  const rate = total ? failed / total : 0;
  const threshold = Number(process.env.MONITORING_API_ERROR_RATE_THRESHOLD || 0.2);
  return {
    checkedCount: total,
    anomalies: total >= 20 && rate > threshold ? [systemAnomaly('API_ERROR_RATE_HIGH', 'P1', 'API 错误率过高', { total, failed, rate, threshold })] : [],
  };
}

async function diskSpaceLow() {
  if (typeof fs.statfsSync !== 'function') return ok();
  const stat = fs.statfsSync(process.cwd());
  const freeBytes = Number(stat.bavail || 0) * Number(stat.bsize || 0);
  const totalBytes = Number(stat.blocks || 0) * Number(stat.bsize || 0);
  const freeRatio = totalBytes ? freeBytes / totalBytes : 1;
  const threshold = Number(process.env.MONITORING_DISK_FREE_RATIO_THRESHOLD || 0.1);
  return {
    checkedCount: 1,
    anomalies: freeRatio < threshold ? [systemAnomaly('DISK_SPACE_LOW', 'P1', '磁盘空间不足', { freeBytes, totalBytes, freeRatio, threshold })] : [],
  };
}

async function storageS3Unhealthy() {
  try {
    const { isS3StorageEnabled } = require('../../../utils/objectStorage');
    if (!isS3StorageEnabled()) return ok();
    return ok();
  } catch (error) {
    return { checkedCount: 1, anomalies: [systemAnomaly('STORAGE_S3_UNHEALTHY', 'P1', '对象存储异常', { message: error.message })] };
  }
}

async function backupRecentFailed() {
  if (!(await repo.tableExists('backup_jobs'))) return ok();
  const [rows] = await repo.db.query(
    `SELECT id, job_type, status, error_message, created_at
       FROM backup_jobs
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)
        AND status = 'failed'
      LIMIT 50`,
  );
  return { checkedCount: rows.length, anomalies: rows.map((row) => systemAnomaly('BACKUP_RECENT_FAILED', 'P1', `最近备份失败：${row.job_type || row.id}`, row)) };
}

async function backupDrillRecentFailed() {
  if (!(await repo.tableExists('restore_drill_reports'))) return ok();
  const [rows] = await repo.db.query(
    `SELECT id, status, summary, created_at
       FROM restore_drill_reports
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        AND status = 'failed'
      LIMIT 50`,
  );
  return { checkedCount: rows.length, anomalies: rows.map((row) => systemAnomaly('BACKUP_DRILL_RECENT_FAILED', 'P1', `最近恢复演练失败：${row.id}`, row)) };
}

module.exports = {
  DB_CONNECTION_UNHEALTHY: dbConnectionUnhealthy,
  REDIS_UNHEALTHY: redisUnhealthy,
  BULLMQ_QUEUE_BACKLOG_HIGH: bullmqBacklogHigh,
  BULLMQ_FAILED_JOBS_HIGH: bullmqFailedJobsHigh,
  SCHEDULER_NOT_RUNNING: schedulerNotRunning,
  API_ERROR_RATE_HIGH: apiErrorRateHigh,
  DISK_SPACE_LOW: diskSpaceLow,
  STORAGE_S3_UNHEALTHY: storageS3Unhealthy,
  BACKUP_RECENT_FAILED: backupRecentFailed,
  BACKUP_DRILL_RECENT_FAILED: backupDrillRecentFailed,
};
