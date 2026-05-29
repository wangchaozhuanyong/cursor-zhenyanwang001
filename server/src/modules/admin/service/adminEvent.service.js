const crypto = require('crypto');
const repo = require('../repository/adminEvent.repository');
const eventBus = require('./adminEventBus.service');
const telegramModule = require('../../telegram');

const VALID_STATUSES = new Set(['open', 'acknowledged', 'in_progress', 'resolved', 'auto_resolved', 'ignored', 'expired']);
const ACTIVE_STATUSES = new Set(['open', 'acknowledged', 'in_progress']);
const STATUS_ACTIONS = {
  acknowledged: 'acknowledged',
  in_progress: 'in_progress',
  resolved: 'resolved',
  auto_resolved: 'auto_resolved',
  ignored: 'ignored',
  expired: 'expired',
};

const FALLBACK_RULES = {
  P0: { popup_enabled: 1, sound_enabled: 1, escalation_minutes: 5, escalation_target: 'boss' },
  P1: { popup_enabled: 1, sound_enabled: 0, escalation_minutes: 30, escalation_target: 'admin_manager' },
  P2: { popup_enabled: 0, sound_enabled: 0 },
  P3: { popup_enabled: 0, sound_enabled: 0 },
};

let escalationTimer = null;

function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
}

function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function normalizeCategory(eventType, category) {
  if (category) return String(category);
  const prefix = String(eventType || '').split('.')[0];
  if (['return', 'refund'].includes(prefix)) return 'refund';
  if (prefix === 'PAYMENT_SUCCESS_ORDER_UNPAID' || prefix === 'ORDER_PAYMENT_AMOUNT_MISMATCH') return 'consistency';
  if (prefix === 'POINTS_BALANCE_MISMATCH' || prefix === 'SKU_NEGATIVE_STOCK') return 'consistency';
  if (prefix === 'REFUND_AMOUNT_EXCEEDS_PAID' || prefix === 'FILE_OBJECT_MISSING') return 'consistency';
  return prefix || 'system';
}

function normalizeSeverity(value, fallback = 'P2') {
  const severity = String(value || fallback).toUpperCase();
  return ['P0', 'P1', 'P2', 'P3'].includes(severity) ? severity : 'P2';
}

function normalizePage(query) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const rawPageSize = Number.parseInt(query.pageSize || query.limit, 10) || 20;
  const pageSize = Math.max(1, Math.min(rawPageSize, 100));
  return { page, pageSize, offset: (page - 1) * pageSize };
}

function parseJson(value) {
  if (!value || typeof value !== 'string') return value || null;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function mapRecord(row) {
  if (!row) return null;
  const payload = parseJson(row.payload);
  return {
    id: row.id,
    eventType: row.event_type,
    category: row.category,
    severity: row.severity,
    status: row.status,
    title: row.title,
    message: row.message || '',
    entityType: row.entity_type,
    entityId: row.entity_id,
    fingerprint: row.fingerprint,
    activeDedupeKey: row.active_dedupe_key,
    payload,
    diagnosis: buildEventDiagnosis(row, payload),
    impactAmount: row.impact_amount == null ? null : Number(row.impact_amount),
    source: row.source || '',
    seenCount: Number(row.seen_count || 0),
    firstSeenAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at,
    acknowledgedAt: row.acknowledged_at,
    inProgressAt: row.in_progress_at,
    resolvedAt: row.resolved_at,
    expiredAt: row.expired_at,
    escalatedAt: row.escalated_at,
    readAt: row.read_at || null,
    hiddenAt: row.hidden_at || null,
    soundPlayedAt: row.sound_played_at || null,
    popupSeenAt: row.popup_seen_at || null,
    popupEnabled: Boolean(row.popup_enabled),
    soundEnabled: Boolean(row.sound_enabled),
    escalationMinutes: row.escalation_minutes == null ? null : Number(row.escalation_minutes),
    escalationTarget: row.escalation_target || null,
    autoResolveEnabled: Boolean(row.auto_resolve_enabled),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function extractOrderNo(message = '', payload = {}) {
  return payload?.orderNo || String(message || '').match(/#?\d{6,}/)?.[0] || '';
}

function buildEventDiagnosis(row, payload = {}) {
  const eventType = String(row?.event_type || '');
  const category = String(row?.category || '');
  const status = String(row?.status || '');
  const active = ACTIVE_STATUSES.has(status);
  const message = String(row?.message || '');
  const reason = String(payload?.reason || '').trim();

  if (eventType.startsWith('backup.') || category === 'backup') {
    const reasonMap = {
      disk_space: {
        summary: active ? '备份仍需确认：曾因磁盘空间不足失败。' : '备份告警已关闭：磁盘空间问题已处理或被忽略。',
        nextAction: '到“备份与恢复”页面重新执行全量备份、增量日志同步和恢复演练；三项成功后再点“完成”。',
      },
      permission: {
        summary: active ? '备份仍需确认：运行账号无法读取 MySQL 数据目录或 binlog 目录。' : '备份权限告警已关闭。',
        nextAction: '在服务器上用实际运行账号执行 node scripts/backup/check-backup-prereqs.js，确认 MYSQL_BINLOG_DIR 可读。',
      },
      object_storage: {
        summary: active ? '备份仍需确认：对象存储上传失败。' : '对象存储告警已关闭。',
        nextAction: '检查 BACKUP_S3_BUCKET、访问密钥、桶权限和网络；重新跑备份任务验证上传成功。',
      },
      missing_full_backup: {
        summary: active ? '备份仍需确认：没有可用全量备份，恢复演练无法开始。' : '缺少全量备份告警已关闭。',
        nextAction: '先执行一次全量备份，成功后再执行恢复演练。',
      },
    };
    const fallback = /space|ENOSPC|disk/i.test(message)
      ? 'disk_space'
      : /EACCES|permission|denied|read.*dir|MYSQL_BINLOG_DIR/i.test(message)
        ? 'permission'
        : /S3|bucket|upload|storage/i.test(message)
          ? 'object_storage'
          : /no.*full.*backup/i.test(message)
            ? 'missing_full_backup'
            : 'generic';
    const picked = reasonMap[reason] || reasonMap[fallback] || {
      summary: active ? '备份任务仍需人工确认，系统无法自动判断根因是否已恢复。' : '备份告警已关闭。',
      nextAction: '查看“备份与恢复”的最近任务日志，重新跑一次备份或恢复演练确认。',
    };
    return {
      state: active ? 'needs_check' : 'closed',
      summary: picked.summary,
      nextAction: picked.nextAction,
      linkUrl: '/admin/backups',
      linkText: '查看备份与恢复',
      closeHint: '只有在最近一次备份/同步/演练成功后，才建议点“完成”。',
    };
  }

  if (eventType === 'order.paid_unhandled_timeout' || eventType === 'order.ship_timeout') {
    const orderNo = extractOrderNo(message, payload);
    return {
      state: active ? 'still_active' : 'closed',
      summary: active
        ? '订单仍在待处理状态，不能只点“已读”。'
        : '订单超时事件已关闭。',
      nextAction: eventType === 'order.ship_timeout'
        ? '进入订单详情确认是否需要发货、退款或标记完成；订单状态恢复后系统会自动关闭告警。'
        : '确认收款后的订单是否已进入发货/处理流程；处理完成后系统会自动关闭告警。',
      linkUrl: orderNo ? `/admin/orders?keyword=${encodeURIComponent(orderNo)}` : '/admin/orders',
      linkText: orderNo ? `查看订单 ${orderNo}` : '查看订单',
      closeHint: '订单状态没有变化前，不建议手动点“完成”。',
    };
  }

  if (category === 'security' || eventType.startsWith('security.')) {
    return {
      state: active ? 'review_required' : 'closed',
      summary: active ? '这类通常是高风险操作记录，不一定是故障。' : '安全事件已关闭。',
      nextAction: '确认操作是否本人或授权人员执行。确认无误点“完成”；不认识该操作就点“处理中”并检查账号、权限和审计日志。',
      linkUrl: '/admin/audit-logs',
      linkText: '查看审计日志',
      closeHint: '确认来源无异常后可以关闭；异常操作不要忽略。',
    };
  }

  return {
    state: active ? 'needs_check' : 'closed',
    summary: active ? '事件仍处于待处理状态，需要确认业务对象是否已恢复。' : '事件已关闭。',
    nextAction: '查看事件详情和关联业务数据，处理根因后再点“完成”。',
    linkUrl: '',
    linkText: '',
    closeHint: '如果只是通知类事件，确认无异常后可关闭。',
  };
}

function publishChange(type, record) {
  eventBus.publishAdminEvent({
    type,
    objectId: record?.id,
    summary: record?.title,
    eventType: record?.event_type || record?.eventType,
    severity: record?.severity,
    status: record?.status,
    category: record?.category,
  });
}

function getTelegramApi() {
  return /** @type {any} */ (telegramModule).api || {};
}

function requireTelegramApi(name) {
  const fn = getTelegramApi()[name];
  if (typeof fn !== 'function') {
    throw new Error(`Telegram module API missing method: ${name}`);
  }
  return fn;
}

async function emitEvent(input = {}, options = {}) {
  const eventType = String(input.eventType || input.type || '').trim();
  if (!eventType) throw new Error('eventType is required');

  const rule = await repo.findRuleByType(eventType);
  if (rule && rule.enabled === 0) return { skipped: true, reason: 'rule_disabled' };

  const category = normalizeCategory(eventType, input.category || rule?.category);
  const severity = normalizeSeverity(input.severity || rule?.severity);
  const title = String(input.title || rule?.title || eventType);
  const entityType = input.entityType ? String(input.entityType) : null;
  const entityId = input.entityId == null ? null : String(input.entityId);
  const fingerprintSource = input.fingerprint || {
    eventType,
    entityType,
    entityId,
    payloadKey: input.payloadKey || null,
  };
  const fingerprint = /^[a-f0-9]{64}$/i.test(String(fingerprintSource))
    ? String(fingerprintSource).toLowerCase()
    : sha256(stableStringify(fingerprintSource));
  const status = VALID_STATUSES.has(input.status) ? input.status : 'open';
  const activeDedupeKey = ACTIVE_STATUSES.has(status) ? fingerprint : null;
  const id = crypto.randomUUID();
  const ruleHints = rule || FALLBACK_RULES[severity] || FALLBACK_RULES.P2;

  await repo.insertRecord({
    id,
    eventType,
    category,
    severity,
    status,
    title,
    message: input.message || '',
    entityType,
    entityId,
    fingerprint,
    activeDedupeKey,
    payload: {
      ...(input.payload || {}),
      rule: {
        popupEnabled: Boolean(ruleHints.popup_enabled),
        soundEnabled: Boolean(ruleHints.sound_enabled),
        escalationMinutes: ruleHints.escalation_minutes ?? null,
        escalationTarget: ruleHints.escalation_target || null,
      },
    },
    impactAmount: input.impactAmount,
    source: input.source || options.source || '',
    createdBy: options.operatorId || input.createdBy || null,
    updatedBy: options.operatorId || input.updatedBy || null,
  });

  const record = await repo.findRecordByActiveDedupeKey(activeDedupeKey) || await repo.findRecordById(id);
  const inserted = record?.id === id;
  await repo.insertAction({
    eventId: record.id,
    actionType: inserted ? 'created' : 'deduped',
    toStatus: record.status,
    operatorId: options.operatorId || null,
    operatorType: options.operatorType || 'system',
    metadata: { eventType, source: input.source || options.source || '' },
  });
  publishChange(inserted ? 'admin.event.created' : 'admin.event.updated', record);
  await maybeNotifyTelegramOnCreate(record, inserted, severity);
  return { event: mapRecord(record), inserted };
}

async function listEvents(query = {}, adminUserId) {
  const { page, pageSize, offset } = normalizePage(query);
  const [list, total] = await Promise.all([
    repo.listEvents(query, adminUserId, pageSize, offset),
    repo.countEvents(query, adminUserId),
  ]);
  return { list: list.map(mapRecord), total, page, pageSize };
}

async function getSummary(adminUserId, query = {}) {
  const [base, categoryCounts, tabCounts] = await Promise.all([
    repo.selectSummary(adminUserId, query),
    repo.selectCategoryCounts(adminUserId, query),
    repo.selectTabCounts(adminUserId, query),
  ]);
  return { ...base, categoryCounts, tabCounts };
}

async function getBossMetrics() {
  return repo.selectBossMetrics();
}

async function markUserState(eventId, adminUserId, state) {
  const now = new Date();
  const fields = {};
  if (state === 'read') fields.readAt = now;
  if (state === 'hidden') fields.hiddenAt = now;
  if (state === 'sound_played') fields.soundPlayedAt = now;
  if (state === 'popup_seen') fields.popupSeenAt = now;
  if (!Object.keys(fields).length) throw new Error('Unsupported user state action');

  const record = await repo.findRecordById(eventId);
  if (!record) throw new Error('事件不存在');
  await repo.upsertUserState(eventId, adminUserId, fields);
  await repo.insertAction({
    eventId,
    actionType: state,
    operatorId: adminUserId,
    operatorType: 'admin',
  });
  publishChange(`admin.event.${state}`, record);
  return { ok: true };
}

async function changeStatus(eventId, nextStatus, operatorId, body = {}) {
  if (!VALID_STATUSES.has(nextStatus)) throw new Error('Unsupported event status');
  const record = await repo.findRecordById(eventId);
  if (!record) throw new Error('事件不存在');
  const fromStatus = record.status;
  if (fromStatus === nextStatus) return { event: mapRecord(record), unchanged: true };

  await repo.updateRecordStatus(eventId, nextStatus, operatorId);
  await repo.insertAction({
    eventId,
    actionType: STATUS_ACTIONS[nextStatus] || 'status_changed',
    fromStatus,
    toStatus: nextStatus,
    operatorId,
    operatorType: body.operatorType || 'admin',
    remark: body.remark || null,
    metadata: body.metadata || {},
  });

  const updated = await repo.findRecordById(eventId);
  publishChange('admin.event.status_changed', updated);
  return { event: mapRecord(updated) };
}

async function acknowledge(eventId, operatorId, body = {}) {
  return changeStatus(eventId, 'acknowledged', operatorId, body);
}

async function startProgress(eventId, operatorId, body = {}) {
  return changeStatus(eventId, 'in_progress', operatorId, body);
}

async function resolve(eventId, operatorId, body = {}) {
  return changeStatus(eventId, body.auto ? 'auto_resolved' : 'resolved', operatorId, body);
}

async function ignore(eventId, operatorId, body = {}) {
  return changeStatus(eventId, 'ignored', operatorId, body);
}

async function autoResolveByFingerprint(fingerprintOrInput, options = {}) {
  const fingerprint = /^[a-f0-9]{64}$/i.test(String(fingerprintOrInput))
    ? String(fingerprintOrInput).toLowerCase()
    : sha256(stableStringify(fingerprintOrInput));
  const record = await repo.findRecordByActiveDedupeKey(fingerprint);
  if (!record) return { resolved: false, reason: 'not_found' };
  const result = await changeStatus(record.id, 'auto_resolved', options.operatorId || null, {
    operatorType: 'system',
    remark: options.remark || '自动恢复',
    metadata: options.metadata || {},
  });
  return { resolved: true, event: result.event };
}

async function listRules() {
  return repo.listRules();
}

async function sendTelegramEscalation(event) {
  const notify = requireTelegramApi('notifyAdminEventEscalation');
  return notify(event);
}

async function maybeNotifyTelegramOnCreate(record, inserted, severity) {
  if (!inserted || !['P0', 'P1'].includes(severity)) return;
  const notify = getTelegramApi().notifyAdminEventAlert;
  if (typeof notify !== 'function') return;
  setImmediate(() => {
    notify(record).catch((error) => {
      console.warn('[adminEvent] telegram alert failed:', error?.message || error);
    });
  });
}

async function scanEscalations() {
  const rows = await repo.listEscalationCandidates(50);
  const results = [];
  for (const event of rows) {
    try {
      const telegramResult = await sendTelegramEscalation(event);
      if (telegramResult.sent) {
        await repo.touchEscalated(event.id);
      }
      await repo.insertAction({
        eventId: event.id,
        actionType: telegramResult.sent ? 'telegram_escalated' : 'telegram_escalation_skipped',
        fromStatus: event.status,
        toStatus: event.status,
        operatorId: null,
        operatorType: 'system',
        remark: telegramResult.sent ? '事件超时已升级 Telegram' : '事件超时升级跳过',
        metadata: {
          target: event.escalation_target || null,
          escalationMinutes: event.escalation_minutes,
          ...telegramResult,
        },
      });
      if (telegramResult.sent) publishChange('admin.event.escalated', { ...event, escalated_at: new Date() });
      results.push({ id: event.id, ...telegramResult });
    } catch (error) {
      await repo.insertAction({
        eventId: event.id,
        actionType: 'telegram_escalation_failed',
        fromStatus: event.status,
        toStatus: event.status,
        operatorType: 'system',
        remark: error?.message || 'Telegram escalation failed',
        metadata: { target: event.escalation_target || null },
      }).catch(() => {});
      results.push({ id: event.id, failed: true, error: error?.message || String(error) });
    }
  }
  return { checked: rows.length, results };
}

function startEscalationScheduler() {
  if (escalationTimer || process.env.ADMIN_EVENT_ESCALATION_DISABLED === '1') return;
  const intervalMs = Math.max(30_000, Number(process.env.ADMIN_EVENT_ESCALATION_INTERVAL_MS || 60_000));
  escalationTimer = setInterval(() => {
    scanEscalations().catch((error) => {
      console.warn('[adminEvent.escalation] scan failed:', error?.message || error);
    });
  }, intervalMs);
  if (typeof escalationTimer.unref === 'function') escalationTimer.unref();
  scanEscalations().catch((error) => {
    console.warn('[adminEvent.escalation] initial scan failed:', error?.message || error);
  });
}

module.exports = {
  VALID_STATUSES,
  emitEvent,
  listEvents,
  getSummary,
  getBossMetrics,
  markUserState,
  changeStatus,
  acknowledge,
  startProgress,
  resolve,
  ignore,
  autoResolveByFingerprint,
  listRules,
  scanEscalations,
  startEscalationScheduler,
};
