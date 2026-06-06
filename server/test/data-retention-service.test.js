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
  const uploadedAssetCleanupPath = require.resolve('../src/modules/dataRetention/service/uploadedAssetCleanup.service');
  const adminModulePath = require.resolve('../src/modules/admin');

  delete require.cache[servicePath];
  delete require.cache[repoPath];
  delete require.cache[auditPath];
  delete require.cache[exportPath];
  delete require.cache[uploadedAssetCleanupPath];
  delete require.cache[adminModulePath];

  const policies = new Map();
  const runs = new Map();
  const steps = [];
  const audits = [];
  const backupCalls = [];
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
        request_snapshot: payload.requestSnapshot || null,
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
  require.cache[uploadedAssetCleanupPath] = {
    id: uploadedAssetCleanupPath,
    filename: uploadedAssetCleanupPath,
    loaded: true,
    exports: options.uploadedAssetCleanup || {
      listOrphanUploadedAssets: async () => ({ matched: 0, batchCount: 0, sampleIds: [] }),
      deleteOrphanUploadedAssets: async () => ({
        matched: 0,
        deleted: 0,
        failed: 0,
        batchCount: 0,
        sampleIds: [],
        cancelled: false,
      }),
    },
  };
  require.cache[adminModulePath] = {
    id: adminModulePath,
    filename: adminModulePath,
    loaded: true,
    exports: {
      api: options.adminApi || options.backupService || {
        createPreCleanupBackup: async (payload) => {
          backupCalls.push(payload);
          return { id: 'backup-1', status: 'success' };
        },
      },
    },
  };

  const service = require(servicePath);
  return { service, repo, tables, runs, steps, audits, backupCalls };
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
    const { service, tables, backupCalls } = loadServiceWithMocks();
    const preview = await service.createPreview({ policy_keys: ['otp_send_logs'] }, makeReq());
    const run = await service.executeRun({ preview_run_id: preview.id, policy_keys: ['otp_send_logs'] }, makeReq());

    assert.equal(backupCalls.length, 1);
    assert.deepEqual(run.request_snapshot.preCleanupBackup, { id: 'backup-1', status: 'success' });
    assert.equal(run.total_deleted, 2);
    assert.deepEqual(tables.otp_send_logs.map((row) => row.id), ['new-1']);
  });

  test('pre-cleanup backup failure blocks deletion and leaves preview reusable', async () => {
    const { service, tables, runs } = loadServiceWithMocks({
      backupService: {
        createPreCleanupBackup: async () => {
          throw new Error('mock pre-cleanup backup failed');
        },
      },
    });
    const preview = await service.createPreview({ policy_keys: ['otp_send_logs'] }, makeReq());

    await assert.rejects(
      () => service.executeRun({ preview_run_id: preview.id, policy_keys: ['otp_send_logs'] }, makeReq()),
      /mock pre-cleanup backup failed/,
    );

    assert.equal(runs.get(preview.id).preview_consumed_at, null);
    assert.deepEqual(tables.otp_send_logs.map((row) => row.id), ['old-1', 'old-2', 'new-1']);
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

  test('expanded operational cleanup policies stay scoped to terminal records', () => {
    const byKey = new Map(listPolicyDefinitions().map((policy) => [policy.key, policy]));
    const cutoffAt = new Date('2025-01-01T00:00:00Z');

    const expectedTables = {
      admin_webauthn_credentials_revoked: 'admin_webauthn_credentials',
      user_feedback_closed: 'user_feedback',
      search_terms: 'search_terms',
      user_security_events_resolved: 'user_security_events',
      user_risk_ips_released: 'user_risk_ips',
      user_risk_devices_released: 'user_risk_devices',
      backup_alerts_resolved: 'backup_alerts',
      backup_jobs_terminal_without_files: 'backup_jobs',
      restore_drill_reports_finished: 'restore_drill_reports',
      uploaded_assets_soft_deleted: 'uploaded_assets',
      uploaded_assets_orphaned_files: 'uploaded_assets',
      data_cleanup_run_steps_history: 'data_cleanup_run_steps',
      data_cleanup_runs_history: 'data_cleanup_runs',
      data_cleanup_locks_expired: 'data_cleanup_locks',
    };

    for (const [key, tableName] of Object.entries(expectedTables)) {
      const policy = byKey.get(key);
      assert.ok(policy, `${key} should be registered`);
      assert.equal(policy.tableName, tableName);
      assert.equal(isProtectedTable(policy.tableName), false);
    }

    assert.match(byKey.get('admin_webauthn_credentials_revoked').where({ cutoffAt }).sql, /revoked_at IS NOT NULL/);
    assert.match(byKey.get('user_feedback_closed').where({ cutoffAt }).sql, /status IN \('resolved','dismissed'\)/);
    assert.match(byKey.get('user_security_events_resolved').where({ cutoffAt }).sql, /resolved_at IS NOT NULL/);
    assert.match(byKey.get('user_risk_ips_released').where({ cutoffAt }).sql, /status <> 'blocked'/);
    assert.match(byKey.get('user_risk_devices_released').where({ cutoffAt }).sql, /status <> 'blocked'/);
    assert.match(byKey.get('backup_alerts_resolved').where({ cutoffAt }).sql, /status = 'resolved'/);
    assert.match(byKey.get('backup_jobs_terminal_without_files').where({ cutoffAt }).sql, /NOT EXISTS \(SELECT 1 FROM backup_files/);
    assert.match(byKey.get('restore_drill_reports_finished').where({ cutoffAt }).sql, /status IN \('success','failed'\)/);
    assert.equal(byKey.get('uploaded_assets_soft_deleted').deleteMode, 'uploaded_asset_delete');
    assert.equal(byKey.get('uploaded_assets_soft_deleted').uploadedAssetMode, 'soft_deleted');
    assert.equal(byKey.get('uploaded_assets_orphaned_files').deleteMode, 'uploaded_asset_delete');
    assert.equal(byKey.get('uploaded_assets_orphaned_files').uploadedAssetMode, 'orphaned');
    assert.equal(byKey.get('uploaded_assets_orphaned_files').enabled, false);
    assert.match(byKey.get('data_cleanup_run_steps_history').where({ cutoffAt }).sql, /data_cleanup_runs r/);
    assert.match(byKey.get('data_cleanup_runs_history').where({ cutoffAt }).sql, /status <> 'running'/);
    assert.match(byKey.get('data_cleanup_locks_expired').where({ cutoffAt }).sql, /expires_at < NOW\(\)/);
  });

  test('uploaded asset cleanup policies use file-aware cleanup service', async () => {
    const calls = [];
    const { service, steps } = loadServiceWithMocks({
      tables: { uploaded_assets: [] },
      uploadedAssetCleanup: {
        listOrphanUploadedAssets: async (policy) => {
          calls.push(['preview', policy.policyKey, policy.uploadedAssetMode]);
          return { matched: 2, batchCount: 1, sampleIds: ['asset-1', 'asset-2'] };
        },
        deleteOrphanUploadedAssets: async (policy) => {
          calls.push(['execute', policy.policyKey, policy.uploadedAssetMode]);
          return {
            matched: 2,
            deleted: 2,
            failed: 0,
            batchCount: 1,
            sampleIds: ['asset-1', 'asset-2'],
            cancelled: false,
          };
        },
      },
    });

    await service.updatePolicy('uploaded_assets_orphaned_files', { enabled: true }, makeReq());
    const preview = await service.createPreview({ policy_keys: ['uploaded_assets_orphaned_files'] }, makeReq());
    const run = await service.executeRun({ preview_run_id: preview.id, policy_keys: ['uploaded_assets_orphaned_files'] }, makeReq());

    assert.deepEqual(calls, [
      ['preview', 'uploaded_assets_orphaned_files', 'orphaned'],
      ['execute', 'uploaded_assets_orphaned_files', 'orphaned'],
    ]);
    assert.equal(preview.total_matched, 2);
    assert.equal(run.total_deleted, 2);
    assert.equal(steps.some((step) => step.policy_key === 'uploaded_assets_orphaned_files' && step.sample_ids.includes('asset-1')), true);
  });

  test('each execute writes audit logs', async () => {
    const { service, audits } = loadServiceWithMocks();
    const preview = await service.createPreview({ policy_keys: ['otp_send_logs'] }, makeReq());
    await service.executeRun({ preview_run_id: preview.id, policy_keys: ['otp_send_logs'] }, makeReq());

    assert.equal(audits.some((entry) => entry.actionType === 'data_cleanup.run'), true);
  });
});

test('uploaded asset orphan scan keeps the whole variant group when one asset is referenced', async () => {
  const servicePath = require.resolve('../src/modules/dataRetention/service/uploadedAssetCleanup.service');
  const dbPath = require.resolve('../src/config/db');
  const objectStoragePath = require.resolve('../src/utils/objectStorage');
  delete require.cache[servicePath];
  delete require.cache[dbPath];
  delete require.cache[objectStoragePath];

  const knownTables = new Set(['uploaded_assets', 'products']);
  const knownColumns = new Map([
    ['products', new Set(['cover_image', 'images', 'video_url', 'description'])],
    ['uploaded_assets', new Set(['asset_group_id', 'storage_key', 'source_storage_key', 'public_url', 'metadata'])],
  ]);
  const assetRows = [
    {
      id: 'keep-full',
      asset_group_id: 'group-keep',
      storage_provider: 'local',
      storage_key: 'uploads/products/keep-full.webp',
      source_storage_key: '',
      public_url: '/uploads/products/keep-full.webp',
      variant_tag: 'full',
      status: 'ready',
      deleted_at: null,
      created_at: new Date('2020-01-01T00:00:00Z'),
    },
    {
      id: 'keep-card',
      asset_group_id: 'group-keep',
      storage_provider: 'local',
      storage_key: 'uploads/products/keep-card.webp',
      source_storage_key: '',
      public_url: '/uploads/products/keep-card.webp',
      variant_tag: 'card',
      status: 'ready',
      deleted_at: null,
      created_at: new Date('2020-01-01T00:00:00Z'),
    },
    {
      id: 'delete-full',
      asset_group_id: 'group-delete',
      storage_provider: 'local',
      storage_key: 'uploads/products/delete-full.webp',
      source_storage_key: '',
      public_url: '/uploads/products/delete-full.webp',
      variant_tag: 'full',
      status: 'ready',
      deleted_at: null,
      created_at: new Date('2020-01-01T00:00:00Z'),
    },
  ];

  const db = {
    async query(sql, params = []) {
      const text = String(sql);
      if (text.includes('INFORMATION_SCHEMA.TABLES')) {
        return [[{ c: knownTables.has(params[0]) ? 1 : 0 }]];
      }
      if (text.includes('INFORMATION_SCHEMA.COLUMNS')) {
        return [[{ c: knownColumns.get(params[0])?.has(params[1]) ? 1 : 0 }]];
      }
      if (text.includes('SELECT asset_group_id')) {
        return [[
          { asset_group_id: 'group-keep', asset_count: 2 },
          { asset_group_id: 'group-delete', asset_count: 1 },
        ]];
      }
      if (text.includes('FROM uploaded_assets') && text.includes('asset_group_id IN')) {
        return [assetRows];
      }
      if (text.includes('SELECT 1 AS hit') && text.includes('FROM `products`')) {
        const referencesKeptFull = params.some((value) => String(value).includes('/uploads/products/keep-full.webp'));
        return referencesKeptFull ? [[{ hit: 1 }]] : [[]];
      }
      if (text.includes('SELECT 1 AS hit')) return [[]];
      throw new Error(`Unexpected query: ${text}`);
    },
  };

  require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: db };
  require.cache[objectStoragePath] = {
    id: objectStoragePath,
    filename: objectStoragePath,
    loaded: true,
    exports: {
      buildStorageKey: (key) => key,
      deleteS3Object: async () => {},
      getPublicUrlByKey: () => '',
      isS3StorageEnabled: () => false,
    },
  };

  const uploadedAssetCleanup = require(servicePath);
  const result = await uploadedAssetCleanup.listOrphanUploadedAssets({
    policyKey: 'uploaded_assets_orphaned_files',
    uploadedAssetMode: 'orphaned',
    cutoffAt: new Date('2025-01-01T00:00:00Z'),
    batchSize: 500,
  });

  assert.deepEqual(result.sampleIds, ['delete-full']);
  assert.equal(result.matched, 1);
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
