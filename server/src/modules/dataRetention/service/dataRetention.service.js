const crypto = require('crypto');
const { BusinessError } = require('../../../errors');
const { writeAuditLog } = require('../../../utils/auditLog');
const repo = require('../repository/dataRetention.repository');
const exportCleanup = require('./exportCleanup.service');
const uploadedAssetCleanup = require('./uploadedAssetCleanup.service');
const {
  MAX_BATCH_SIZE,
  MIN_BATCH_SIZE,
  assertCatalogIsSafe,
  buildPolicyRuntime,
  getPolicyDefinition,
  isProtectedTable,
  listPolicyDefinitions,
  normalizeBatchSize,
} = require('./policyCatalog.service');

const LOCK_NAME = 'data_cleanup:run';
const PREVIEW_TTL_MS = Number(process.env.DATA_CLEANUP_PREVIEW_TTL_MINUTES || 30) * 60 * 1000;
const SCHEDULER_INTERVAL_MS = Number(process.env.DATA_CLEANUP_INTERVAL_HOURS || 24) * 60 * 60 * 1000;
const SCHEDULER_INITIAL_DELAY_MS = Number(process.env.DATA_CLEANUP_INITIAL_DELAY_MS || 5 * 60 * 1000);
const PRE_CLEANUP_BACKUP_DISABLED = () => process.env.DATA_CLEANUP_PRE_BACKUP_DISABLED === '1';

let policiesSeeded = false;
let schedulerTimer = null;
let schedulerInitialTimer = null;

function uniq(values) {
  return [...new Set((values || []).map((v) => String(v || '').trim()).filter(Boolean))];
}

function sameKeys(a, b) {
  const left = uniq(a).sort();
  const right = uniq(b).sort();
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function auditActor(req) {
  return {
    operatorId: req?.user?.id || null,
    operatorRole: req?.user?.role || '',
  };
}

async function auditCleanup(req, actionType, result, summary, extra = {}) {
  const actor = auditActor(req);
  await writeAuditLog({
    req,
    operatorId: extra.operatorId === undefined ? actor.operatorId : extra.operatorId,
    operatorRole: extra.operatorRole === undefined ? actor.operatorRole : extra.operatorRole,
    actionType,
    objectType: 'data_cleanup',
    objectId: extra.objectId == null ? null : String(extra.objectId),
    summary,
    before: extra.before,
    after: extra.after,
    result,
    errorMessage: extra.errorMessage || '',
  });
}

async function ensurePreCleanupBackup(req, options = {}) {
  if (PRE_CLEANUP_BACKUP_DISABLED() || options.skipPreCleanupBackup === true) return null;
  const adminApi = /** @type {any} */ (require('../../admin')).api || {};
  if (typeof adminApi.createPreCleanupBackup !== 'function') {
    throw new Error('PRE_CLEANUP_BACKUP_API_MISSING');
  }
  const operatorId = options.operatorId === undefined ? req?.user?.id || null : options.operatorId;
  return adminApi.createPreCleanupBackup({
    req,
    userId: operatorId,
    reason: `data_cleanup:${options.runType || 'manual'}`,
    metadata: {
      previewRunId: options.previewRunId || null,
      policyKeys: options.policyKeys || [],
      runType: options.runType || 'manual',
    },
  });
}

async function ensureDefaultPolicies() {
  if (policiesSeeded) return;
  assertCatalogIsSafe();
  for (const policy of listPolicyDefinitions()) {
    await repo.upsertDefaultPolicy(policy);
  }
  policiesSeeded = true;
}

function mapPolicy(policy) {
  return {
    key: policy.policyKey,
    title: policy.title,
    description: policy.description || '',
    category: policy.category,
    table_name: policy.tableName,
    date_column: policy.dateColumn,
    delete_mode: policy.deleteMode,
    retention_days: policy.retentionDays,
    default_retention_days: policy.defaultRetentionDays,
    min_retention_days: policy.minRetentionDays,
    batch_size: policy.batchSize,
    enabled: policy.enabled,
    locked: policy.locked,
    protected: policy.deleteMode !== 'file_delete' && isProtectedTable(policy.tableName),
  };
}

function isUploadedAssetPolicy(policy) {
  return policy.deleteMode === 'uploaded_asset_delete';
}

async function getPolicyRuntimes() {
  await ensureDefaultPolicies();
  const rows = await repo.listPolicies();
  return rows.map((row) => buildPolicyRuntime(row)).filter(Boolean);
}

async function listPolicies() {
  const policies = await getPolicyRuntimes();
  return policies.map(mapPolicy);
}

async function resolvePolicies(policyKeys) {
  const policies = await getPolicyRuntimes();
  const byKey = new Map(policies.map((policy) => [policy.policyKey, policy]));
  const requested = uniq(policyKeys);
  const keys = requested.length
    ? requested
    : policies.filter((policy) => policy.enabled).map((policy) => policy.policyKey);
  for (const key of keys) {
    if (!getPolicyDefinition(key) || !byKey.has(key)) {
      throw new BusinessError(400, `未知清理策略: ${key}`);
    }
  }
  if (!keys.length) throw new BusinessError(400, '没有可执行的清理策略');
  return keys.map((key) => byKey.get(key)).filter(Boolean);
}

function parsePolicyPatch(body = {}) {
  const patch = {};
  for (const key of ['retention_days', 'enabled', 'batch_size']) {
    if (body[key] !== undefined) patch[key] = body[key];
  }
  if (Object.keys(patch).length === 0) {
    throw new BusinessError(400, '没有可更新的策略字段');
  }
  if (patch.retention_days !== undefined) {
    const days = Number(patch.retention_days);
    if (!Number.isInteger(days) || days < 1 || days > 3650) {
      throw new BusinessError(400, 'retention_days 必须是 1-3650 的整数');
    }
    patch.retention_days = days;
  }
  if (patch.enabled !== undefined) {
    patch.enabled = patch.enabled === true || patch.enabled === 1 || patch.enabled === '1' ? 1 : 0;
  }
  if (patch.batch_size !== undefined) {
    const batch = normalizeBatchSize(patch.batch_size);
    if (!batch) {
      throw new BusinessError(400, `batch_size 必须是 ${MIN_BATCH_SIZE}-${MAX_BATCH_SIZE} 的整数`);
    }
    patch.batch_size = batch;
  }
  return patch;
}

async function updatePolicy(policyKey, body, req) {
  await ensureDefaultPolicies();
  const beforeRow = await repo.getPolicy(policyKey);
  const before = buildPolicyRuntime(beforeRow);
  if (!before) throw new BusinessError(404, '清理策略不存在');
  const patch = parsePolicyPatch(body);

  if (before.locked) {
    if (patch.enabled === 0) {
      throw new BusinessError(400, '锁定策略不允许禁用');
    }
    if (patch.retention_days !== undefined) {
      const minDays = Math.max(before.minRetentionDays, before.retentionDays);
      if (patch.retention_days < minDays) {
        throw new BusinessError(400, '锁定策略不允许降低保留时间');
      }
    }
  }

  const updated = buildPolicyRuntime(await repo.updatePolicy(policyKey, patch));
  await auditCleanup(req, 'data_cleanup.policy.update', 'success', `更新清理策略 ${policyKey}`, {
    objectId: policyKey,
    before: mapPolicy(before),
    after: mapPolicy(updated),
  });
  return mapPolicy(updated);
}

async function resetDefaults(req) {
  await ensureDefaultPolicies();
  const before = await listPolicies();
  for (const policy of listPolicyDefinitions()) {
    await repo.resetPolicyToDefault(policy);
  }
  policiesSeeded = false;
  await ensureDefaultPolicies();
  const after = await listPolicies();
  await auditCleanup(req, 'data_cleanup.policy.reset_defaults', 'success', '重置数据清理策略默认值', {
    before,
    after,
  });
  return after;
}

async function previewDbPolicy(policy, runId) {
  const stepId = await repo.insertStep({
    runId,
    policyKey: policy.policyKey,
    tableName: policy.tableName,
    status: 'running',
    cutoffAt: policy.cutoffAt,
    batchSize: policy.batchSize,
  });

  if (!policy.enabled) {
    await repo.updateStep(stepId, { status: 'skipped', error_message: 'POLICY_DISABLED', finished_at: true });
    return { matched: 0, deleted: 0, failed: 0, status: 'skipped' };
  }
  if (isProtectedTable(policy.tableName)) {
    await repo.updateStep(stepId, { status: 'failed', error_message: 'PROTECTED_TABLE', finished_at: true });
    return { matched: 0, deleted: 0, failed: 1, status: 'failed' };
  }
  if (!(await repo.tableExists(policy.tableName))) {
    await repo.updateStep(stepId, { status: 'skipped', error_message: 'TABLE_NOT_FOUND', finished_at: true });
    return { matched: 0, deleted: 0, failed: 0, status: 'skipped' };
  }

  const where = policy.where({ cutoffAt: policy.cutoffAt });
  const matched = await repo.countMatchingRows(policy.tableName, where.sql, where.params);
  const sampleIds = await repo.sampleMatchingIds(policy.tableName, policy.idColumn, where.sql, where.params, 10);
  await repo.updateStep(stepId, {
    status: 'success',
    matched_count: matched,
    deleted_count: 0,
    batch_size: policy.batchSize,
    batch_count: 0,
    sample_ids: sampleIds,
    finished_at: true,
  });
  return { matched, deleted: 0, failed: 0, status: 'success' };
}

async function previewFilePolicy(policy, runId) {
  const files = exportCleanup.listExpiredExportFiles(policy.retentionDays);
  const stepId = await repo.insertStep({
    runId,
    policyKey: policy.policyKey,
    tableName: policy.tableName,
    status: policy.enabled ? 'success' : 'skipped',
    cutoffAt: policy.cutoffAt,
    matchedCount: policy.enabled ? files.length : 0,
    deletedCount: 0,
    batchSize: policy.batchSize,
    batchCount: 0,
    sampleIds: policy.enabled ? files.slice(0, 10).map((file) => file.fileName) : [],
    errorMessage: policy.enabled ? null : 'POLICY_DISABLED',
  });
  await repo.updateStep(stepId, { finished_at: true });
  return { matched: policy.enabled ? files.length : 0, deleted: 0, failed: 0, status: policy.enabled ? 'success' : 'skipped' };
}

async function previewUploadedAssetPolicy(policy, runId) {
  const stepId = await repo.insertStep({
    runId,
    policyKey: policy.policyKey,
    tableName: policy.tableName,
    status: 'running',
    cutoffAt: policy.cutoffAt,
    batchSize: policy.batchSize,
  });
  if (!policy.enabled) {
    await repo.updateStep(stepId, { status: 'skipped', error_message: 'POLICY_DISABLED', finished_at: true });
    return { matched: 0, deleted: 0, failed: 0, status: 'skipped' };
  }
  if (!(await repo.tableExists(policy.tableName))) {
    await repo.updateStep(stepId, { status: 'skipped', error_message: 'TABLE_NOT_FOUND', finished_at: true });
    return { matched: 0, deleted: 0, failed: 0, status: 'skipped' };
  }

  const result = await uploadedAssetCleanup.listOrphanUploadedAssets(policy);
  await repo.updateStep(stepId, {
    status: 'success',
    matched_count: result.matched,
    deleted_count: 0,
    batch_size: policy.batchSize,
    batch_count: result.batchCount || 0,
    sample_ids: result.sampleIds || [],
    finished_at: true,
  });
  return { matched: result.matched, deleted: 0, failed: 0, status: 'success' };
}

async function previewPolicy(policy, runId) {
  if (policy.deleteMode === 'file_delete') return previewFilePolicy(policy, runId);
  if (isUploadedAssetPolicy(policy)) return previewUploadedAssetPolicy(policy, runId);
  return previewDbPolicy(policy, runId);
}

async function createPreview(body = {}, req = null, options = {}) {
  const policies = await resolvePolicies(body.policy_keys || body.policyKeys);
  const policyKeys = policies.map((policy) => policy.policyKey);
  const runId = await repo.createRun({
    runType: 'preview',
    status: 'running',
    triggeredBy: options.operatorId === undefined ? req?.user?.id || null : options.operatorId,
    policyKeys,
    requestSnapshot: { policyKeys },
  });

  let totalMatched = 0;
  let totalFailed = 0;
  for (const policy of policies) {
    try {
      const result = await previewPolicy(policy, runId);
      totalMatched += result.matched;
      totalFailed += result.failed;
    } catch (error) {
      totalFailed += 1;
      const stepId = await repo.insertStep({
        runId,
        policyKey: policy.policyKey,
        tableName: policy.tableName,
        status: 'failed',
        cutoffAt: policy.cutoffAt,
        batchSize: policy.batchSize,
        errorMessage: error?.message || String(error),
      });
      await repo.updateStep(stepId, { finished_at: true });
    }
  }

  const status = totalFailed > 0 && totalFailed >= policies.length ? 'failed' : (totalFailed > 0 ? 'partial_failed' : 'previewed');
  await repo.updateRun(runId, {
    status,
    total_matched: totalMatched,
    total_deleted: 0,
    total_failed: totalFailed,
    finished_at: true,
  });
  await auditCleanup(req, 'data_cleanup.preview', status === 'failed' ? 'failure' : 'success', `生成清理预览 #${runId}`, {
    operatorId: options.operatorId,
    objectId: runId,
    after: { policyKeys, totalMatched, totalFailed },
    errorMessage: totalFailed ? `${totalFailed} policy preview failed` : '',
  });
  return repo.getRunWithSteps(runId);
}

async function validatePreviewForExecution(previewRunId, policyKeys, req, options = {}) {
  if (!previewRunId) throw new BusinessError(400, '执行前必须先生成 preview_run_id');
  const preview = await repo.getRunById(previewRunId);
  if (!preview || preview.run_type !== 'preview') throw new BusinessError(400, 'preview_run_id 无效');
  if (preview.preview_consumed_at) throw new BusinessError(409, '该清理预览已被使用，请重新预览');
  if (!['previewed', 'partial_failed'].includes(preview.status)) {
    throw new BusinessError(400, '清理预览未完成或不可执行');
  }
  const previewStarted = new Date(preview.started_at || preview.created_at || 0).getTime();
  if (!Number.isFinite(previewStarted) || Date.now() - previewStarted > PREVIEW_TTL_MS) {
    throw new BusinessError(400, '清理预览已过期，请重新预览');
  }
  const operatorId = options.operatorId === undefined ? req?.user?.id || null : options.operatorId;
  if (operatorId && preview.triggered_by && String(operatorId) !== String(preview.triggered_by)) {
    throw new BusinessError(403, '只能执行自己生成的清理预览');
  }
  const keys = uniq(policyKeys).length ? uniq(policyKeys) : uniq(preview.policy_keys);
  if (!sameKeys(keys, preview.policy_keys)) {
    throw new BusinessError(400, '执行策略必须与预览策略一致');
  }
  return { preview, policyKeys: keys };
}

async function executeDbPolicy(policy, runId) {
  const stepId = await repo.insertStep({
    runId,
    policyKey: policy.policyKey,
    tableName: policy.tableName,
    status: 'running',
    cutoffAt: policy.cutoffAt,
    batchSize: policy.batchSize,
  });

  if (!policy.enabled) {
    await repo.updateStep(stepId, { status: 'skipped', error_message: 'POLICY_DISABLED', finished_at: true });
    return { matched: 0, deleted: 0, failed: 0, cancelled: false };
  }
  if (isProtectedTable(policy.tableName)) {
    await repo.updateStep(stepId, { status: 'failed', error_message: 'PROTECTED_TABLE', finished_at: true });
    return { matched: 0, deleted: 0, failed: 1, cancelled: false };
  }
  if (!(await repo.tableExists(policy.tableName))) {
    await repo.updateStep(stepId, { status: 'skipped', error_message: 'TABLE_NOT_FOUND', finished_at: true });
    return { matched: 0, deleted: 0, failed: 0, cancelled: false };
  }

  const where = policy.where({ cutoffAt: policy.cutoffAt });
  const matched = await repo.countMatchingRows(policy.tableName, where.sql, where.params);
  const sampleIds = await repo.sampleMatchingIds(policy.tableName, policy.idColumn, where.sql, where.params, 10);
  let deleted = 0;
  let batchCount = 0;
  let cancelled = false;

  while (true) {
    if (await repo.isRunCancelRequested(runId)) {
      cancelled = true;
      break;
    }
    const ids = await repo.sampleMatchingIds(policy.tableName, policy.idColumn, where.sql, where.params, policy.batchSize);
    if (!ids.length) break;
    const affected = await repo.deleteIds(policy.tableName, policy.idColumn, ids);
    batchCount += 1;
    deleted += affected;
    if (affected === 0) {
      throw new Error('DELETE_RETURNED_ZERO_ROWS');
    }
    if (ids.length < policy.batchSize) break;
  }

  await repo.updateStep(stepId, {
    status: cancelled ? 'cancelled' : 'success',
    matched_count: matched,
    deleted_count: deleted,
    batch_size: policy.batchSize,
    batch_count: batchCount,
    sample_ids: sampleIds,
    finished_at: true,
  });
  return { matched, deleted, failed: 0, cancelled };
}

async function executeFilePolicy(policy, runId) {
  const stepId = await repo.insertStep({
    runId,
    policyKey: policy.policyKey,
    tableName: policy.tableName,
    status: 'running',
    cutoffAt: policy.cutoffAt,
    batchSize: policy.batchSize,
  });
  if (!policy.enabled) {
    await repo.updateStep(stepId, { status: 'skipped', error_message: 'POLICY_DISABLED', finished_at: true });
    return { matched: 0, deleted: 0, failed: 0, cancelled: false };
  }
  const files = exportCleanup.listExpiredExportFiles(policy.retentionDays);
  const result = await exportCleanup.deleteExpiredExportFiles(
    policy.retentionDays,
    policy.batchSize,
    () => repo.isRunCancelRequested(runId),
  );
  const cancelled = await repo.isRunCancelRequested(runId);
  await repo.updateStep(stepId, {
    status: cancelled ? 'cancelled' : 'success',
    matched_count: result.matched,
    deleted_count: result.deleted,
    batch_size: policy.batchSize,
    batch_count: result.batchCount,
    sample_ids: files.slice(0, 10).map((file) => file.fileName),
    finished_at: true,
  });
  return { matched: result.matched, deleted: result.deleted, failed: 0, cancelled };
}

async function executeUploadedAssetPolicy(policy, runId) {
  const stepId = await repo.insertStep({
    runId,
    policyKey: policy.policyKey,
    tableName: policy.tableName,
    status: 'running',
    cutoffAt: policy.cutoffAt,
    batchSize: policy.batchSize,
  });
  if (!policy.enabled) {
    await repo.updateStep(stepId, { status: 'skipped', error_message: 'POLICY_DISABLED', finished_at: true });
    return { matched: 0, deleted: 0, failed: 0, cancelled: false };
  }
  if (!(await repo.tableExists(policy.tableName))) {
    await repo.updateStep(stepId, { status: 'skipped', error_message: 'TABLE_NOT_FOUND', finished_at: true });
    return { matched: 0, deleted: 0, failed: 0, cancelled: false };
  }

  const result = await uploadedAssetCleanup.deleteOrphanUploadedAssets(
    policy,
    () => repo.isRunCancelRequested(runId),
  );
  const cancelled = result.cancelled || await repo.isRunCancelRequested(runId);
  const failed = Number(result.failed || 0);
  await repo.updateStep(stepId, {
    status: cancelled ? 'cancelled' : (failed > 0 ? 'partial_failed' : 'success'),
    matched_count: result.matched,
    deleted_count: result.deleted,
    batch_size: policy.batchSize,
    batch_count: result.batchCount || 0,
    sample_ids: result.sampleIds || [],
    error_message: failed > 0 ? `UPLOAD_ASSET_DELETE_FAILED:${failed}` : null,
    finished_at: true,
  });
  return { matched: result.matched, deleted: result.deleted, failed, cancelled };
}

async function executePolicy(policy, runId) {
  if (policy.deleteMode === 'file_delete') return executeFilePolicy(policy, runId);
  if (isUploadedAssetPolicy(policy)) return executeUploadedAssetPolicy(policy, runId);
  return executeDbPolicy(policy, runId);
}

async function executeRun(body = {}, req = null, options = {}) {
  let runId = null;
  let lockOwner = null;
  let acquired = false;
  try {
    const { preview, policyKeys } = await validatePreviewForExecution(
      body.preview_run_id || body.previewRunId,
      body.policy_keys || body.policyKeys,
      req,
      options,
    );

    lockOwner = `${options.runType || 'manual'}:${crypto.randomUUID()}`;
    acquired = await repo.tryAcquireLock(LOCK_NAME, lockOwner, Number(process.env.DATA_CLEANUP_LOCK_TTL_SECONDS || 3600));
    if (!acquired) throw new BusinessError(409, '已有清理任务正在执行');

    const preCleanupBackup = await ensurePreCleanupBackup(req, {
      operatorId: options.operatorId,
      policyKeys,
      previewRunId: preview.id,
      runType: options.runType || 'manual',
      skipPreCleanupBackup: options.skipPreCleanupBackup,
    });

    const consumed = await repo.consumePreviewRun(preview.id);
    if (!consumed) throw new BusinessError(409, '该清理预览已被使用，请重新预览');

    const policies = await resolvePolicies(policyKeys);
    runId = await repo.createRun({
      runType: options.runType || 'manual',
      status: 'running',
      triggeredBy: options.operatorId === undefined ? req?.user?.id || null : options.operatorId,
      previewRunId: preview.id,
      policyKeys,
      requestSnapshot: { previewRunId: preview.id, policyKeys, preCleanupBackup },
    });

    let totalMatched = 0;
    let totalDeleted = 0;
    let totalFailed = 0;
    let cancelled = false;
    const failureReasons = [];

    for (const policy of policies) {
      if (cancelled) break;
      try {
        const result = await executePolicy(policy, runId);
        totalMatched += result.matched;
        totalDeleted += result.deleted;
        totalFailed += result.failed;
        cancelled = result.cancelled;
      } catch (error) {
        totalFailed += 1;
        failureReasons.push(`${policy.policyKey}: ${error?.message || String(error)}`);
        const stepId = await repo.insertStep({
          runId,
          policyKey: policy.policyKey,
          tableName: policy.tableName,
          status: 'failed',
          cutoffAt: policy.cutoffAt,
          batchSize: policy.batchSize,
          errorMessage: error?.message || String(error),
        });
        await repo.updateStep(stepId, { finished_at: true });
      }
    }

    if (await repo.isRunCancelRequested(runId)) cancelled = true;
    const status = cancelled
      ? 'cancelled'
      : totalFailed > 0 && totalFailed >= policies.length
        ? 'failed'
        : totalFailed > 0
          ? 'partial_failed'
          : 'success';
    const errorMessage = failureReasons.join('; ').slice(0, 2000) || null;
    await repo.updateRun(runId, {
      status,
      total_matched: totalMatched,
      total_deleted: totalDeleted,
      total_failed: totalFailed,
      error_message: errorMessage,
      finished_at: true,
    });

    await auditCleanup(req, 'data_cleanup.run', status === 'success' ? 'success' : 'failure', `执行数据清理 #${runId}: ${status}`, {
      operatorId: options.operatorId,
      objectId: runId,
      after: { previewRunId: preview.id, policyKeys, status, totalMatched, totalDeleted, totalFailed },
      errorMessage: errorMessage || '',
    });
    return repo.getRunWithSteps(runId);
  } catch (error) {
    if (runId) {
      await repo.updateRun(runId, {
        status: 'failed',
        error_message: error?.message || String(error),
        finished_at: true,
      }).catch(() => {});
    }
    await auditCleanup(req, 'data_cleanup.run', 'failure', '执行数据清理失败', {
      operatorId: options.operatorId,
      objectId: runId,
      errorMessage: error?.message || String(error),
    });
    throw error;
  } finally {
    if (acquired && lockOwner) {
      await repo.releaseLock(LOCK_NAME, lockOwner).catch(() => {});
    }
  }
}

async function cancelRun(id, req) {
  const ok = await repo.requestCancel(id);
  if (!ok) throw new BusinessError(400, '清理任务不存在或不在运行中');
  await auditCleanup(req, 'data_cleanup.run.cancel', 'success', `请求取消数据清理 #${id}`, {
    objectId: id,
  });
  return repo.getRunWithSteps(id);
}

async function listRuns(query) {
  await ensureDefaultPolicies();
  return repo.listRuns(query);
}

async function getRun(id) {
  await ensureDefaultPolicies();
  const run = await repo.getRunWithSteps(id);
  if (!run) throw new BusinessError(404, '清理记录不存在');
  return run;
}

async function getOverview() {
  await ensureDefaultPolicies();
  const policies = await listPolicies();
  const recentRuns = await repo.listRuns({ page: 1, pageSize: 5, excludeRunType: 'preview' });
  const runningRun = await repo.findRunningRun();
  return {
    policyCount: policies.length,
    enabledPolicyCount: policies.filter((policy) => policy.enabled).length,
    lockedPolicyCount: policies.filter((policy) => policy.locked).length,
    protectedTables: [
      'orders',
      'order_items',
      'payment_*',
      'myinvois_*',
      'inventory_stock_records',
      'points_records',
      'reward_*',
    ],
    batchSizeRange: { min: MIN_BATCH_SIZE, max: MAX_BATCH_SIZE },
    previewTtlMinutes: Math.round(PREVIEW_TTL_MS / 60000),
    recentRuns: recentRuns.list,
    runningRun,
  };
}

async function runScheduledCleanup() {
  const preview = await createPreview({}, null, { operatorId: null });
  if (!preview || !['previewed', 'partial_failed'].includes(preview.status)) return preview;
  return executeRun({ preview_run_id: preview.id, policy_keys: preview.policy_keys }, null, {
    runType: 'scheduled',
    operatorId: null,
  });
}

function startDataRetentionScheduler() {
  if (schedulerTimer || process.env.DATA_CLEANUP_SCHEDULER_DISABLED === '1') return;
  const tick = () => {
    runScheduledCleanup().catch((error) => {
      console.error('[data-cleanup.scheduler] failed:', error?.message || error);
    });
  };
  schedulerInitialTimer = setTimeout(tick, Math.max(0, SCHEDULER_INITIAL_DELAY_MS));
  if (schedulerInitialTimer.unref) schedulerInitialTimer.unref();
  schedulerTimer = setInterval(tick, Math.max(60_000, SCHEDULER_INTERVAL_MS));
  if (schedulerTimer.unref) schedulerTimer.unref();
}

module.exports = {
  cancelRun,
  createPreview,
  executeRun,
  getOverview,
  getRun,
  listPolicies,
  listRuns,
  resetDefaults,
  runScheduledCleanup,
  startDataRetentionScheduler,
  updatePolicy,
  __test: {
    ensureDefaultPolicies,
    sameKeys,
  },
};
