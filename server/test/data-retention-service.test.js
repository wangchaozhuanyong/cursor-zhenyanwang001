const { describe, test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');

const {
  isProtectedTable,
  listPolicyDefinitions,
} = require('../src/modules/dataRetention/service/policyCatalog.service');

function clearModule(modulePath) {
  try {
    delete require.cache[require.resolve(modulePath)];
  } catch {
    // ignore
  }
}

function makeReq(mfaVerifiedAt = Math.floor(Date.now() / 1000)) {
  return {
    user: {
      id: 'admin-1',
      role: 'super_admin',
      isSuperAdmin: true,
      permissions: ['data_cleanup.view', 'data_cleanup.manage', 'data_cleanup.execute'],
      mfaVerifiedAt,
    },
    headers: {},
    method: 'POST',
    originalUrl: '/api/admin/data-retention/runs',
  };
}

function loadServiceWithMocks(options = {}) {
  const servicePath = require.resolve('../src/modules/dataRetention/service/dataRetention.service');
  const repoPath = require.resolve('../src/modules/dataRetention/repository/dataRetention.repository');
  const auditPath = require.resolve('../src/utils/auditLog');
  const exportPath = require.resolve('../src/modules/dataRetention/service/exportCleanup.service');

  delete require.cache[servicePath];
  delete require.cache[repoPath];
  delete require.cache[auditPath];
  delete require.cache[exportPath];

  const policies = new Map();
  const runs = new Map();
  const steps = [];
  const audits = [];
  const tables = {
    otp_send_logs: [
      { id: 'old-1', created_at: new Date('2020-01-01T00:00:00Z') },
      { id: 'old-2', created_at: new Date('2020-01-02T00:00:00Z') },
      { id: 'new-1', created_at: new Date('2999-01-01T00:00:00Z') },
    ],
    orders: [
      { id: 'order-1', created_at: new Date('2020-01-01T00:00:00Z') },
    ],
    payment_orders: [
      { id: 'pay-1', created_at: new Date('2020-01-01T00:00:00Z') },
    ],
    ...(options.tables || {}),
  };
  let runSeq = 1;
  let stepSeq = 1;
  let locked = false;

  function policyRow(policy) {
    return {
      policy_key: policy.key,
      title: policy.title,
      description: policy.description || '',
      category: policy.category,
      table_name: policy.tableName,
      date_column: policy.dateColumn,
      delete_mode: policy.deleteMode,
      retention_days: policy.retentionDays,
      default_retention_days: policy.retentionDays,
      min_retention_days: policy.minRetentionDays || 1,
      batch_size: policy.batchSize,
      enabled: policy.enabled ? 1 : 0,
      locked: policy.locked ? 1 : 0,
    };
  }

  function eligibleRows(tableName, params) {
    const cutoff = new Date(params[0]).getTime();
    return (tables[tableName] || []).filter((row) => {
      const value = row.created_at || row.updated_at || row.viewed_at || row.started_at;
      return value && new Date(value).getTime() < cutoff;
    });
  }

  const repo = {
    async upsertDefaultPolicy(policy) {
      if (!policies.has(policy.key)) policies.set(policy.key, policyRow(policy));
    },
    async listPolicies() {
      return [...policies.values()];
    },
    async getPolicy(key) {
      return policies.get(key) || null;
    },
    async updatePolicy(key, patch) {
      const row = policies.get(key);
      Object.assign(row, patch);
      return row;
    },
    async resetPolicyToDefault(policy) {
      policies.set(policy.key, policyRow(policy));
    },
    async tableExists(tableName) {
      return Object.prototype.hasOwnProperty.call(tables, tableName);
    },
    async countMatchingRows(tableName, _whereSql, params) {
      return eligibleRows(tableName, params).length;
    },
    async sampleMatchingIds(tableName, _idColumn, _whereSql, params, limit) {
      return eligibleRows(tableName, params).slice(0, limit).map((row) => row.id);
    },
    async deleteIds(tableName, _idColumn, ids) {
      if (options.deleteDelayMs) {
        await new Promise((resolve) => setTimeout(resolve, options.deleteDelayMs));
      }
      const before = tables[tableName].length;
      tables[tableName] = tables[tableName].filter((row) => !ids.includes(row.id));
      return before - tables[tableName].length;
    },
    async createRun(payload) {
      const id = runSeq++;
      runs.set(id, {
        id,
        run_type: payload.runType || 'manual',
        status: payload.status || 'running',
        triggered_by: payload.triggeredBy || null,
        preview_run_id: payload.previewRunId || null,
        preview_consumed_at: null,
        policy_keys: payload.policyKeys || [],
        total_matched: 0,
        total_deleted: 0,
        total_failed: 0,
        cancel_requested: false,
        started_at: new Date(),
        created_at: new Date(),
      });
      return id;
    },
    async updateRun(id, fields) {
      const run = runs.get(Number(id));
      Object.assign(run, fields);
      if (fields.finished_at) run.finished_at = new Date();
    },
    async consumePreviewRun(id) {
      const run = runs.get(Number(id));
      if (!run || run.run_type !== 'preview' || run.preview_consumed_at) return false;
      run.preview_consumed_at = new Date();
      return true;
    },
    async insertStep(payload) {
      const id = stepSeq++;
      steps.push({
        id,
        run_id: payload.runId,
        policy_key: payload.policyKey,
        table_name: payload.tableName,
        status: payload.status || 'running',
        matched_count: payload.matchedCount || 0,
        deleted_count: payload.deletedCount || 0,
        batch_size: payload.batchSize || 1000,
        batch_count: payload.batchCount || 0,
        sample_ids: payload.sampleIds || [],
        error_message: payload.errorMessage || null,
      });
      return id;
    },
    async updateStep(id, fields) {
      const step = steps.find((item) => item.id === Number(id));
      Object.assign(step, fields);
      if (fields.finished_at) step.finished_at = new Date();
    },
    async getRunById(id) {
      return runs.get(Number(id)) || null;
    },
    async getRunWithSteps(id) {
      const run = runs.get(Number(id));
      if (!run) return null;
      return { ...run, steps: steps.filter((step) => step.run_id === Number(id)) };
    },
    async listRuns() {
      return { list: [...runs.values()], total: runs.size, page: 1, pageSize: 20, totalPages: 1 };
    },
    async findRunningRun() {
      return [...runs.values()].find((run) => run.status === 'running') || null;
    },
    async requestCancel(id) {
      const run = runs.get(Number(id));
      if (!run || run.status !== 'running') return false;
      run.cancel_requested = true;
      return true;
    },
    async isRunCancelRequested(id) {
      return Boolean(runs.get(Number(id))?.cancel_requested);
    },
    async tryAcquireLock() {
      if (locked) return false;
      locked = true;
      return true;
    },
    async releaseLock() {
      locked = false;
    },
  };

  require.cache[repoPath] = { id: repoPath, filename: repoPath, loaded: true, exports: repo };
  require.cache[auditPath] = {
    id: auditPath,
    filename: auditPath,
    loaded: true,
    exports: { writeAuditLog: async (entry) => audits.push(entry) },
  };
  require.cache[exportPath] = {
    id: exportPath,
    filename: exportPath,
    loaded: true,
    exports: {
      listExpiredExportFiles: () => [],
      deleteExpiredExportFiles: async () => ({ matched: 0, deleted: 0, batchCount: 0 }),
    },
  };

  const service = require(servicePath);
  return { service, repo, tables, runs, steps, audits };
}

describe('data retention cleanup service', () => {
  beforeEach(() => {
    clearModule('../src/modules/dataRetention/service/dataRetention.service');
  });

  test('preview does not delete data', async () => {
    const { service, tables } = loadServiceWithMocks();
    const preview = await service.createPreview({ policy_keys: ['otp_send_logs'] }, makeReq());

    assert.equal(preview.total_matched, 2);
    assert.equal(preview.total_deleted, 0);
    assert.deepEqual(tables.otp_send_logs.map((row) => row.id), ['old-1', 'old-2', 'new-1']);
  });

  test('execute deletes only matched rows', async () => {
    const { service, tables } = loadServiceWithMocks();
    const preview = await service.createPreview({ policy_keys: ['otp_send_logs'] }, makeReq());
    const run = await service.executeRun({ preview_run_id: preview.id, policy_keys: ['otp_send_logs'] }, makeReq());

    assert.equal(run.total_deleted, 2);
    assert.deepEqual(tables.otp_send_logs.map((row) => row.id), ['new-1']);
  });

  test('locked policy cannot lower retention days', async () => {
    const { service } = loadServiceWithMocks();
    await service.listPolicies();

    await assert.rejects(
      () => service.updatePolicy('audit_logs', { retention_days: 2000 }, makeReq()),
      /锁定策略不允许降低保留时间/,
    );
  });

  test('concurrent executions allow only one success', async () => {
    const { service } = loadServiceWithMocks({ deleteDelayMs: 30 });
    const preview = await service.createPreview({ policy_keys: ['otp_send_logs'] }, makeReq());
    const results = await Promise.allSettled([
      service.executeRun({ preview_run_id: preview.id, policy_keys: ['otp_send_logs'] }, makeReq()),
      service.executeRun({ preview_run_id: preview.id, policy_keys: ['otp_send_logs'] }, makeReq()),
    ]);

    assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
    assert.equal(results.filter((result) => result.status === 'rejected').length, 1);
  });

  test('orders, payment, invoice, inventory, points, and reward tables are protected', () => {
    for (const table of ['orders', 'order_items', 'payment_orders', 'myinvois_documents', 'inventory_stock_records', 'points_records', 'reward_records']) {
      assert.equal(isProtectedTable(table), true, `${table} should be protected`);
    }
    const unsafeDefaults = listPolicyDefinitions()
      .filter((policy) => policy.deleteMode !== 'file_delete')
      .filter((policy) => isProtectedTable(policy.tableName));
    assert.deepEqual(unsafeDefaults, []);
  });

  test('each execute writes audit logs', async () => {
    const { service, audits } = loadServiceWithMocks();
    const preview = await service.createPreview({ policy_keys: ['otp_send_logs'] }, makeReq());
    await service.executeRun({ preview_run_id: preview.id, policy_keys: ['otp_send_logs'] }, makeReq());

    assert.equal(audits.some((entry) => entry.actionType === 'data_cleanup.run'), true);
  });
});

test('route blocks execute without recent MFA', async () => {
  const routePath = require.resolve('../src/modules/dataRetention/routes/dataRetention.routes');
  const adminAuthPath = require.resolve('../src/middleware/adminAuth');
  const controllerPath = require.resolve('../src/modules/dataRetention/controller/dataRetention.controller');
  delete require.cache[routePath];
  delete require.cache[adminAuthPath];
  delete require.cache[controllerPath];

  let reached = false;
  function adminAuth(req, _res, next) {
    req.user = {
      id: 'admin-1',
      role: 'admin',
      isSuperAdmin: false,
      permissions: ['data_cleanup.execute'],
      mfaVerifiedAt: 0,
    };
    next();
  }
  adminAuth.requirePermission = () => (_req, _res, next) => next();
  adminAuth.requireAnyPermission = () => (_req, _res, next) => next();
  adminAuth.requireRecentMfa = require('../src/modules/admin/service/adminMfa.service').requireRecentMfa;

  require.cache[adminAuthPath] = { id: adminAuthPath, filename: adminAuthPath, loaded: true, exports: adminAuth };
  require.cache[controllerPath] = {
    id: controllerPath,
    filename: controllerPath,
    loaded: true,
    exports: {
      overview: (_req, res) => res.json({ ok: true }),
      listPolicies: (_req, res) => res.json({ ok: true }),
      updatePolicy: (_req, res) => res.json({ ok: true }),
      resetDefaults: (_req, res) => res.json({ ok: true }),
      preview: (_req, res) => res.json({ ok: true }),
      createRun: (_req, res) => { reached = true; res.json({ ok: true }); },
      listRuns: (_req, res) => res.json({ ok: true }),
      getRun: (_req, res) => res.json({ ok: true }),
      cancelRun: (_req, res) => res.json({ ok: true }),
    },
  };

  const routes = require(routePath);
  const app = express();
  app.use(express.json());
  app.use('/', routes);

  const res = await request(app).post('/runs').send({ preview_run_id: 1 });
  assert.equal(res.status, 403);
  assert.equal(reached, false);
});
