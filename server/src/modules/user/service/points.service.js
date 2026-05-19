const { generateId } = require('../../../utils/helpers');
const { BusinessError } = require('../../../errors/BusinessError');
const repo = require('../repository/points.repository');

function toInt(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

async function changePoints(conn, params) {
  const {
    userId,
    amount,
    action,
    description,
    orderId,
    orderNo,
    sourceType,
    relatedRecordId,
    operatorId,
    metadata,
    allowNegative = true,
  } = params;

  const delta = toInt(amount);
  if (!userId) throw new BusinessError(400, 'Missing userId');
  if (!action) throw new BusinessError(400, 'Missing points action');
  if (!delta) return { skipped: true, amount: 0 };

  if (relatedRecordId) {
    const existing = await repo.selectRecordByRelatedForUpdate(conn, relatedRecordId, action);
    if (existing) return { skipped: true, record: existing };
  }

  const account = await repo.selectAccountForUpdate(conn, userId);
  if (!account) throw new BusinessError(404, 'Points account not found');
  const before = toInt(account.balance);
  const after = before + delta;
  if (!allowNegative && after < 0) {
    throw new BusinessError(400, 'Insufficient points balance');
  }

  await repo.updateAccountBalance(conn, userId, delta, after);
  const recordId = generateId();
  await repo.insertLedgerRecord(conn, {
    id: recordId,
    userId,
    orderId,
    orderNo,
    action,
    amount: delta,
    balanceBefore: before,
    balanceAfter: after,
    description,
    sourceType,
    relatedRecordId,
    status: 'success',
    operatorId,
    metadata,
  });
  return { skipped: false, recordId, balanceBefore: before, balanceAfter: after, amount: delta };
}

async function runInTransaction(fn) {
  const conn = await repo.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function getRecords(userId, query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(query.pageSize, 10) || 20));
  const { action } = query;
  const total = await repo.countRecords(userId, action);
  const offset = (page - 1) * pageSize;
  const rows = await repo.selectRecordsPage(userId, action, pageSize, offset);
  return { list: rows, total, page, pageSize };
}

async function getAdminRecords(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize, 10) || 20));
  const filters = {
    action: query.action || '',
    userId: query.userId || '',
    keyword: query.keyword || '',
  };
  const total = await repo.countAdminRecords(filters);
  const offset = (page - 1) * pageSize;
  const list = await repo.selectAdminRecordsPage(filters, pageSize, offset);
  const stats = await repo.selectAdminStats();
  return { list, total, page, pageSize, stats };
}

async function getBalance(userId) {
  const balance = await repo.selectUserPointsBalance(userId);
  return { balance };
}

async function resolveSignInAward() {
  let points = 5;
  let enabled = true;
  let hasRule = false;
  try {
    const rule = await repo.selectSignInRule();
    if (rule) {
      hasRule = true;
      points = toInt(rule.points);
      enabled = !!rule.enabled;
    }
  } catch {
    /* 鐞涖劍婀潻浣盒╃粵澶婄磽鐢憡妞傞崶鐐衡偓鈧妯款吇 */
  }
  return { points, enabled, hasRule };
}

async function getClientPointsConfig() {
  const { points, enabled, hasRule } = await resolveSignInAward();
  const p = toInt(points);
  const configInvalid = hasRule && enabled && p < 1;
  return {
    signIn: {
      points: hasRule ? p : 5,
      /** 鐟欏嫬鍨€涙ê婀稉鏂挎儙閻劋绗栫粔顖氬瀻閳? 閹靛秴褰茬粵鎯у煂閿涙稒婀柊宥囩枂鐟欏嫬鍨弮鏈电瑢姒涙顓?5 閸掑棔绔撮懛?*/
      enabled: hasRule ? enabled && !configInvalid : true,
      usesDefault: !hasRule,
      disabledReason: !hasRule
        ? null
        : !enabled
          ? 'Sign-in points rule is disabled by admin'
          : configInvalid
            ? 'Sign-in points must be at least 1'
            : null,
    },
    /** 鐠併垹宕熺粔顖氬瀻閺夈儴鍤滈崯鍡楁惂閵嗗瞼袧閸掑棗鈧鈧秴鐡у▓纰夌礉閺€顖欑帛鐎瑰本鍨氶崥搴″弳鐠?*/
    orderPointsHint: 'Points are awarded after paid orders based on current rules.',
  };
}

async function signIn(userId) {
  const today = new Date().toISOString().slice(0, 10);
  const existing = await repo.findSignInToday(userId, today);
  if (existing) return { error: { code: 400, message: 'Already signed in today' } };

  const { points, enabled, hasRule } = await resolveSignInAward();
  if (hasRule && !enabled) return { error: { code: 400, message: 'Sign-in points rule is disabled' } };
  const grant = hasRule ? toInt(points) : 5;
  if (grant < 1) return { error: { code: 400, message: 'daily sign-in points must be at least 1' } };

  await runInTransaction((conn) => changePoints(conn, {
    userId,
    amount: grant,
    action: 'sign_in',
    description: 'Daily sign-in points',
    sourceType: 'sign_in',
    relatedRecordId: `sign_in:${userId}:${today}`,
  }));
  return { data: { points: grant }, message: 'Sign-in success' };
}

async function adjustUserPoints(userId, amount, reason, operatorId) {
  return runInTransaction((conn) => changePoints(conn, {
    userId,
    amount,
    action: amount > 0 ? 'admin_add' : 'admin_deduct',
    description: reason || 'Admin points adjustment',
    sourceType: 'admin_adjust',
    operatorId,
  }));
}

async function settleOrderPoints(conn, order, options = {}) {
  const amount = toInt(order?.total_points);
  if (!order?.id || !order.user_id || amount <= 0) return { skipped: true };
  return changePoints(conn, {
    userId: order.user_id,
    amount,
    action: 'order_earn',
    description: "Order points earned", 
    orderId: order.id,
    orderNo: order.order_no,
    sourceType: 'order_completion',
    relatedRecordId: `order_earn:${order.id}`,
    operatorId: options.operatorId,
    metadata: { trigger: options.trigger || 'order_completed' },
  });
}

async function reverseOrderPoints(conn, order, reason, options = {}) {
  const amount = toInt(order?.total_points);
  if (!order?.id || !order.user_id || amount <= 0) return { skipped: true };
  const earned = await repo.selectRecordByRelatedForUpdate(conn, `order_earn:${order.id}`, 'order_earn');
  if (!earned) return { skipped: true };
  return changePoints(conn, {
    userId: order.user_id,
    amount: -amount,
    action: 'order_reverse',
    description: reason || "Order points reversed", 
    orderId: order.id,
    orderNo: order.order_no,
    sourceType: 'order_reversal',
    relatedRecordId: `order_reverse:${order.id}`,
    operatorId: options.operatorId,
    metadata: { trigger: options.trigger || 'order_reversal' },
  });
}

module.exports = {
  changePoints,
  settleOrderPoints,
  reverseOrderPoints,
  adjustUserPoints,
  getRecords,
  getAdminRecords,
  getBalance,
  getClientPointsConfig,
  signIn,
};


