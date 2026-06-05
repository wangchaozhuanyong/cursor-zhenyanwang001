const crypto = require('crypto');
const { NotFoundError, ValidationError } = require('../../../errors');
const { writeAuditLog } = require('../../../utils/auditLog');
const repo = require('../repository/privacy.repository');

const DELETE_CONFIRM_TEXT = 'DELETE ACCOUNT';
const ACCOUNT_CANCEL_CONFIRM_TEXTS = new Set([
  DELETE_CONFIRM_TEXT,
  '\u6ce8\u9500\u8d26\u53f7',
]);

function buildExportPayload({ user, addresses, orders, pointsRecords }) {
  return {
    exported_at: new Date().toISOString(),
    scope: {
      profile: '\u8d26\u53f7\u57fa\u7840\u8d44\u6599',
      addresses: '\u6536\u8d27\u5730\u5740',
      orders: 'Orders and order items',
      points_records: '\u79ef\u5206\u6d41\u6c34',
    },
    profile: user,
    addresses,
    orders,
    points_records: pointsRecords,
  };
}

async function exportAccountData(userId, req) {
  const user = await repo.selectUserForExport(userId);
  if (!user) throw new NotFoundError('\u7528\u6237\u4e0d\u5b58\u5728');

  const [addresses, orders, pointsRecords] = await Promise.all([
    repo.selectAddressesForExport(userId),
    repo.selectOrdersForExport(userId),
    repo.selectPointsRecordsForExport(userId),
  ]);

  const payload = buildExportPayload({ user, addresses, orders, pointsRecords });
  await writeAuditLog({
    req,
    operatorId: userId,
    actionType: 'user.data_export',
    objectType: 'user',
    objectId: userId,
    summary: '\u7528\u6237\u5bfc\u51fa\u8d26\u53f7\u6570\u636e',
    after: {
      addressCount: addresses.length,
      orderCount: orders.length,
      pointsRecordCount: pointsRecords.length,
    },
    result: 'success',
  });

  return { data: payload, message: '\u5bfc\u51fa\u6570\u636e\u5df2\u751f\u6210' };
}

async function cancelAccount(userId, body, req) {
  const confirmText = String(body.confirmText || '').trim();
  if (!ACCOUNT_CANCEL_CONFIRM_TEXTS.has(confirmText)) {
    throw new ValidationError('\u8bf7\u8f93\u5165\u786e\u8ba4\u6587\u5b57\u4ee5\u6ce8\u9500\u8d26\u53f7');
  }

  const conn = await repo.getConnection();
  let beforeUser = null;
  let deletedAddressCount = 0;
  let anonymizedOrderCount = 0;
  try {
    await conn.beginTransaction();
    beforeUser = await repo.selectUserForDeletion(conn, userId);
    if (!beforeUser || beforeUser.deleted_at) throw new NotFoundError('\u7528\u6237\u4e0d\u5b58\u5728');

    const suffix = crypto.createHash('sha256').update(String(userId)).digest('hex').slice(0, 12);
    const anonymizedPhone = `deleted_${suffix}`;
    const anonymizedInviteCode = `DEL${suffix.toUpperCase()}`;
    const anonymizedPasswordHash = `deleted:${crypto.randomBytes(24).toString('hex')}`;

    const affected = await repo.anonymizeUser(
      conn,
      userId,
      anonymizedPhone,
      anonymizedInviteCode,
      anonymizedPasswordHash,
    );
    if (affected !== 1) throw new NotFoundError('\u7528\u6237\u4e0d\u5b58\u5728');

    anonymizedOrderCount = await repo.anonymizeOrders(conn, userId);
    deletedAddressCount = await repo.deleteAddresses(conn, userId);
    await conn.commit();
  } catch (err) {
    try { await conn.rollback(); } catch { /* ignore */ }
    await writeAuditLog({
      req,
      operatorId: userId,
      actionType: 'user.account_cancel',
      objectType: 'user',
      objectId: userId,
      summary: '\u7528\u6237\u6ce8\u9500\u8d26\u53f7\u5931\u8d25',
      result: 'failure',
      errorMessage: err?.message || 'unknown',
    });
    throw err;
  } finally {
    conn.release();
  }

  await writeAuditLog({
    req,
    operatorId: userId,
    operatorName: beforeUser?.nickname || '',
    operatorRole: 'user',
    actionType: 'user.account_cancel',
    objectType: 'user',
    objectId: userId,
    summary: '\u7528\u6237\u6ce8\u9500\u8d26\u53f7\u5e76\u5b8c\u6210\u533f\u540d\u5316',
    before: beforeUser,
    after: { deletedAddressCount, anonymizedOrderCount },
    result: 'success',
  });

  return { data: null, message: '\u8d26\u53f7\u5df2\u6ce8\u9500' };
}

module.exports = {
  DELETE_CONFIRM_TEXT,
  exportAccountData,
  cancelAccount,
};
