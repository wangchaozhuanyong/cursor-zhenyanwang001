const db = require('../../../config/db');

const ACTIVE_STATUSES = ['open', 'acknowledged', 'in_progress'];

function toJson(value) {
  if (value == null) return null;
  return typeof value === 'string' ? value : JSON.stringify(value);
}

function buildListWhere(query, adminUserId) {
  const where = ['(us.hidden_at IS NULL)'];
  const params = [adminUserId];

  if (query.status) {
    if (query.status === 'pending') {
      where.push(`r.status IN ('open', 'acknowledged', 'in_progress')`);
    } else if (query.status === 'recovered') {
      where.push(`r.status IN ('resolved', 'auto_resolved')`);
    } else {
      where.push('r.status = ?');
      params.push(query.status);
    }
  }
  if (query.tab === 'pending') where.push(`r.status IN ('open', 'acknowledged', 'in_progress')`);
  if (query.tab === 'urgent') where.push(`r.severity IN ('P0', 'P1') AND r.status IN ('open', 'acknowledged', 'in_progress')`);
  if (query.tab === 'security') where.push(`r.category = 'security'`);
  if (query.tab === 'recovered') where.push(`r.status IN ('resolved', 'auto_resolved')`);
  if (query.category) {
    where.push('r.category = ?');
    params.push(query.category);
  }
  if (query.severity) {
    where.push('r.severity = ?');
    params.push(query.severity);
  }
  if (query.unread === '1' || query.unread === true) {
    where.push('us.read_at IS NULL');
  }
  if (query.keyword) {
    where.push('(r.title LIKE ? OR r.message LIKE ? OR r.entity_id LIKE ?)');
    const kw = `%${query.keyword}%`;
    params.push(kw, kw, kw);
  }

  return { where: `WHERE ${where.join(' AND ')}`, params };
}

async function findRuleByType(eventType) {
  const [[row]] = await db.query('SELECT * FROM admin_event_rules WHERE event_type = ? LIMIT 1', [eventType]);
  return row || null;
}

async function insertRecord(payload) {
  await db.query(
    `INSERT INTO admin_event_records
      (id, event_type, category, severity, status, title, message, entity_type, entity_id, fingerprint,
       active_dedupe_key, payload, impact_amount, source, created_by, updated_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
      seen_count = seen_count + 1,
      last_seen_at = NOW(),
      message = VALUES(message),
      payload = VALUES(payload),
      impact_amount = VALUES(impact_amount),
      updated_by = VALUES(updated_by)`,
    [
      payload.id,
      payload.eventType,
      payload.category,
      payload.severity,
      payload.status || 'open',
      payload.title,
      payload.message || '',
      payload.entityType || null,
      payload.entityId || null,
      payload.fingerprint,
      payload.activeDedupeKey,
      toJson(payload.payload || {}),
      payload.impactAmount ?? null,
      payload.source || '',
      payload.createdBy || null,
      payload.updatedBy || null,
    ],
  );
}

async function findRecordByActiveDedupeKey(activeDedupeKey) {
  if (!activeDedupeKey) return null;
  const [[row]] = await db.query('SELECT * FROM admin_event_records WHERE active_dedupe_key = ? LIMIT 1', [activeDedupeKey]);
  return row || null;
}

async function findRecordById(eventId) {
  const [[row]] = await db.query('SELECT * FROM admin_event_records WHERE id = ? LIMIT 1', [eventId]);
  return row || null;
}

async function insertAction(payload) {
  await db.query(
    `INSERT INTO admin_event_actions
      (event_id, action_type, from_status, to_status, operator_id, operator_type, remark, metadata)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      payload.eventId,
      payload.actionType,
      payload.fromStatus || null,
      payload.toStatus || null,
      payload.operatorId || null,
      payload.operatorType || 'admin',
      payload.remark || null,
      toJson(payload.metadata || {}),
    ],
  );
}

async function updateRecordStatus(eventId, status, operatorId) {
  const activeDedupeKeySql = ACTIVE_STATUSES.includes(status) ? 'active_dedupe_key' : 'NULL';
  await db.query(
    `UPDATE admin_event_records
     SET status = ?,
         active_dedupe_key = ${activeDedupeKeySql},
         acknowledged_at = IF(? = 'acknowledged' AND acknowledged_at IS NULL, NOW(), acknowledged_at),
         in_progress_at = IF(? = 'in_progress' AND in_progress_at IS NULL, NOW(), in_progress_at),
         resolved_at = IF(? IN ('resolved', 'auto_resolved', 'ignored') AND resolved_at IS NULL, NOW(), resolved_at),
         expired_at = IF(? = 'expired' AND expired_at IS NULL, NOW(), expired_at),
         updated_by = ?
     WHERE id = ?`,
    [status, status, status, status, status, operatorId || null, eventId],
  );
}

async function touchEscalated(eventId) {
  await db.query('UPDATE admin_event_records SET escalated_at = NOW() WHERE id = ? AND escalated_at IS NULL', [eventId]);
}

async function upsertUserState(eventId, adminUserId, fields) {
  const inserts = {
    read_at: fields.readAt || null,
    hidden_at: fields.hiddenAt || null,
    sound_played_at: fields.soundPlayedAt || null,
    popup_seen_at: fields.popupSeenAt || null,
  };
  await db.query(
    `INSERT INTO admin_event_user_states
      (event_id, admin_user_id, read_at, hidden_at, sound_played_at, popup_seen_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
      read_at = COALESCE(VALUES(read_at), read_at),
      hidden_at = COALESCE(VALUES(hidden_at), hidden_at),
      sound_played_at = COALESCE(VALUES(sound_played_at), sound_played_at),
      popup_seen_at = COALESCE(VALUES(popup_seen_at), popup_seen_at)`,
    [eventId, adminUserId, inserts.read_at, inserts.hidden_at, inserts.sound_played_at, inserts.popup_seen_at],
  );
}

async function listEvents(query, adminUserId, pageSize, offset) {
  const { where, params } = buildListWhere(query, adminUserId);
  const [rows] = await db.query(
    `SELECT
       r.*,
       us.read_at,
       us.hidden_at,
       us.sound_played_at,
       us.popup_seen_at,
       rule.popup_enabled,
       rule.sound_enabled,
       rule.escalation_minutes,
       rule.escalation_target,
       rule.auto_resolve_enabled
     FROM admin_event_records r
     LEFT JOIN admin_event_user_states us ON us.event_id = r.id AND us.admin_user_id = ?
     LEFT JOIN admin_event_rules rule ON rule.event_type = r.event_type
     ${where}
     ORDER BY FIELD(r.severity, 'P0', 'P1', 'P2', 'P3'), r.last_seen_at DESC
     LIMIT ? OFFSET ?`,
    [...params, pageSize, offset],
  );
  return rows;
}

async function countEvents(query, adminUserId) {
  const { where, params } = buildListWhere(query, adminUserId);
  const [[{ total }]] = await db.query(
    `SELECT COUNT(*) AS total
     FROM admin_event_records r
     LEFT JOIN admin_event_user_states us ON us.event_id = r.id AND us.admin_user_id = ?
     ${where}`,
    params,
  );
  return Number(total || 0);
}

/**
 * @param {string|number} adminUserId
 * @param {Record<string, any>} [query]
 */
async function selectCategoryCounts(adminUserId, query = {}) {
  const listQuery = { ...query };
  delete listQuery.category;
  delete listQuery.page;
  delete listQuery.pageSize;
  delete listQuery.limit;
  const { where, params } = buildListWhere(listQuery, adminUserId);
  const [rows] = await db.query(
    `SELECT r.category, COUNT(*) AS total
     FROM admin_event_records r
     LEFT JOIN admin_event_user_states us ON us.event_id = r.id AND us.admin_user_id = ?
     ${where}
     GROUP BY r.category`,
    params,
  );
  const counts = {};
  for (const row of rows) {
    if (!row?.category) continue;
    counts[String(row.category)] = Number(row.total || 0);
  }
  return counts;
}

async function selectTabCounts(adminUserId, query = {}) {
  /** @type {Record<string, any>} */
  const baseQuery = { ...query };
  delete baseQuery.tab;
  delete baseQuery.page;
  delete baseQuery.pageSize;
  delete baseQuery.limit;
  const { where, params } = buildListWhere(baseQuery, adminUserId);
  const [[row]] = await db.query(
    `SELECT
      SUM(CASE WHEN us.hidden_at IS NULL THEN 1 ELSE 0 END) AS all_count,
      SUM(CASE WHEN us.hidden_at IS NULL AND r.status IN ('open', 'acknowledged', 'in_progress') THEN 1 ELSE 0 END) AS pending_count,
      SUM(CASE WHEN us.hidden_at IS NULL AND r.severity IN ('P0', 'P1') AND r.status IN ('open', 'acknowledged', 'in_progress') THEN 1 ELSE 0 END) AS urgent_count,
      SUM(CASE WHEN us.hidden_at IS NULL AND r.category = 'security' THEN 1 ELSE 0 END) AS security_count,
      SUM(CASE WHEN us.hidden_at IS NULL AND r.status IN ('resolved', 'auto_resolved') THEN 1 ELSE 0 END) AS recovered_count
     FROM admin_event_records r
     LEFT JOIN admin_event_user_states us ON us.event_id = r.id AND us.admin_user_id = ?
     ${where}`,
    params,
  );
  return {
    all: Number(row?.all_count || 0),
    pending: Number(row?.pending_count || 0),
    urgent: Number(row?.urgent_count || 0),
    security: Number(row?.security_count || 0),
    recovered: Number(row?.recovered_count || 0),
  };
}

async function selectSummary(adminUserId, query = {}) {
  /** @type {Record<string, any>} */
  const summaryQuery = { ...query };
  delete summaryQuery.page;
  delete summaryQuery.pageSize;
  delete summaryQuery.limit;
  const { where, params } = buildListWhere(summaryQuery, adminUserId);
  const [[row]] = await db.query(
    `SELECT
      SUM(CASE WHEN us.read_at IS NULL AND us.hidden_at IS NULL THEN 1 ELSE 0 END) AS unread_count,
      SUM(CASE WHEN us.hidden_at IS NULL AND r.status IN ('open', 'acknowledged', 'in_progress') THEN 1 ELSE 0 END) AS unresolved_count,
      SUM(CASE WHEN us.hidden_at IS NULL AND r.severity = 'P0' AND r.status IN ('open', 'acknowledged', 'in_progress') THEN 1 ELSE 0 END) AS p0_count,
      SUM(CASE WHEN us.hidden_at IS NULL AND r.category = 'security' AND r.status IN ('open', 'acknowledged', 'in_progress') THEN 1 ELSE 0 END) AS security_count,
      SUM(CASE WHEN us.hidden_at IS NULL AND r.status IN ('resolved', 'auto_resolved') THEN 1 ELSE 0 END) AS recovered_count
     FROM admin_event_records r
     LEFT JOIN admin_event_user_states us ON us.event_id = r.id AND us.admin_user_id = ?
     ${where}`,
    params,
  );
  return {
    unreadCount: Number(row?.unread_count || 0),
    unresolvedCount: Number(row?.unresolved_count || 0),
    p0Count: Number(row?.p0_count || 0),
    securityCount: Number(row?.security_count || 0),
    recoveredCount: Number(row?.recovered_count || 0),
  };
}

async function selectBossMetrics() {
  const [[row]] = await db.query(
    `SELECT
      SUM(CASE WHEN impact_amount IS NOT NULL AND DATE(created_at) = CURDATE() THEN 1 ELSE 0 END) AS revenue_events_today,
      SUM(CASE WHEN category = 'order' AND status IN ('open', 'acknowledged', 'in_progress') THEN 1 ELSE 0 END) AS pending_orders,
      SUM(CASE WHEN event_type IN ('order.paid_unhandled_timeout', 'order.ship_timeout') AND status IN ('open', 'acknowledged', 'in_progress') THEN 1 ELSE 0 END) AS paid_unshipped,
      SUM(CASE WHEN category = 'refund' AND status IN ('open', 'acknowledged', 'in_progress') THEN 1 ELSE 0 END) AS refund_pending,
      SUM(CASE WHEN category = 'stock' AND status IN ('open', 'acknowledged', 'in_progress') THEN 1 ELSE 0 END) AS stock_risks,
      SUM(CASE WHEN category = 'payment' AND status IN ('open', 'acknowledged', 'in_progress') THEN 1 ELSE 0 END) AS payment_anomalies,
      SUM(CASE WHEN category = 'consistency' AND status IN ('open', 'acknowledged', 'in_progress') THEN 1 ELSE 0 END) AS consistency_anomalies,
      SUM(CASE WHEN category = 'security' AND status IN ('open', 'acknowledged', 'in_progress') THEN 1 ELSE 0 END) AS security_risks,
      SUM(CASE WHEN category = 'system' AND status IN ('open', 'acknowledged', 'in_progress') THEN 1 ELSE 0 END) AS system_health_risks
     FROM admin_event_records`,
  );
  return {
    revenueEventsToday: Number(row?.revenue_events_today || 0),
    pendingOrders: Number(row?.pending_orders || 0),
    paidUnshipped: Number(row?.paid_unshipped || 0),
    refundPending: Number(row?.refund_pending || 0),
    stockRisks: Number(row?.stock_risks || 0),
    paymentAnomalies: Number(row?.payment_anomalies || 0),
    consistencyAnomalies: Number(row?.consistency_anomalies || 0),
    securityRisks: Number(row?.security_risks || 0),
    systemHealthRisks: Number(row?.system_health_risks || 0),
  };
}

async function listRules() {
  const [rows] = await db.query('SELECT * FROM admin_event_rules ORDER BY FIELD(severity, "P0", "P1", "P2", "P3"), category, event_type');
  return rows;
}

async function listEscalationCandidates(limit = 50) {
  const [rows] = await db.query(
    `SELECT
       r.*,
       rule.escalation_minutes,
       rule.escalation_target
     FROM admin_event_records r
     JOIN admin_event_rules rule ON rule.event_type = r.event_type
     WHERE rule.enabled = 1
       AND rule.escalation_minutes IS NOT NULL
       AND r.escalated_at IS NULL
       AND (
         (r.severity = 'P0' AND r.status = 'open' AND r.acknowledged_at IS NULL)
         OR (r.severity = 'P1' AND r.status IN ('open', 'acknowledged'))
       )
       AND r.created_at <= DATE_SUB(NOW(), INTERVAL rule.escalation_minutes MINUTE)
     ORDER BY FIELD(r.severity, 'P0', 'P1', 'P2', 'P3'), r.created_at ASC
     LIMIT ?`,
    [limit],
  );
  return rows;
}

async function listActiveRecordsByTypes(eventTypes = [], limit = 500) {
  if (!Array.isArray(eventTypes) || eventTypes.length === 0) return [];
  const placeholders = eventTypes.map(() => '?').join(',');
  const [rows] = await db.query(
    `SELECT *
     FROM admin_event_records
     WHERE event_type IN (${placeholders})
       AND status IN ('open', 'acknowledged', 'in_progress')
     ORDER BY created_at ASC
     LIMIT ?`,
    [...eventTypes, limit],
  );
  return rows;
}

module.exports = {
  findRuleByType,
  insertRecord,
  findRecordByActiveDedupeKey,
  findRecordById,
  insertAction,
  updateRecordStatus,
  touchEscalated,
  upsertUserState,
  listEvents,
  countEvents,
  selectSummary,
  selectCategoryCounts,
  selectTabCounts,
  selectBossMetrics,
  listRules,
  listEscalationCandidates,
  listActiveRecordsByTypes,
};
