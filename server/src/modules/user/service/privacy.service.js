const crypto = require('crypto');
const { NotFoundError, ValidationError } = require('../../../errors');
const { writeAuditLog } = require('../../../utils/auditLog');
const repo = require('../repository/privacy.repository');

const DELETE_CONFIRM_TEXT = 'DELETE ACCOUNT';

function buildExportPayload({ user, addresses, orders, pointsRecords }) {
  return {
    exported_at: new Date().toISOString(),
    scope: {
      profile: '账号基础资料',
      addresses: '收货地址',
      orders: 'Orders and order items',
      points_records: '积分流水',
    },
    profile: user,
    addresses,
    orders,
    points_records: pointsRecords,
  };
}

async function exportAccountData(userId, req) {
  const user = await repo.selectUserForExport(userId);
  if (!user) throw new NotFoundError('User not found');

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
    summary: 'User exported account data',
    after: {
      addressCount: addresses.length,
      orderCount: orders.length,
      pointsRecordCount: pointsRecords.length,
    },
    result: 'success',
  });

  return { data: payload, message: 'Export data generated' };
}

async function cancelAccount(userId, body, req) {
  if (body.confirmText !== DELETE_CONFIRM_TEXT) {
    throw new ValidationError('Please enter the confirmation text to cancel account');
  }

  const conn = await repo.getConnection();
  let beforeUser = null;
  let deletedAddressCount = 0;
  let anonymizedOrderCount = 0;
  try {
    await conn.beginTransaction();
    beforeUser = await repo.selectUserForDeletion(conn, userId);
    if (!beforeUser || beforeUser.deleted_at) throw new NotFoundError('User not found');

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
    if (affected !== 1) throw new NotFoundError('User not found');

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
      summary: 'User account cancellation failed',
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
    summary: 'User account canceled and anonymized',
    before: beforeUser,
    after: { deletedAddressCount, anonymizedOrderCount },
    result: 'success',
  });

  return { data: null, message: 'Account canceled' };
}

module.exports = {
  DELETE_CONFIRM_TEXT,
  exportAccountData,
  cancelAccount,
};


