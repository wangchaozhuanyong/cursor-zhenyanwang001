function parseSnapshot(snapshot) {
  if (!snapshot) return null;
  if (typeof snapshot === 'object') return snapshot;
  if (typeof snapshot === 'string') {
    try {
      return JSON.parse(snapshot);
    } catch {
      return null;
    }
  }
  return null;
}

function firstPositiveNumber(...values) {
  for (const value of values) {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

/** 与 schemaContract.orderEffectivePayableSql 口径一致（列表行展示用） */
function resolveOrderPayableAmount(row = {}) {
  const snap = parseSnapshot(row.amount_snapshot);
  return firstPositiveNumber(
    row.payable_amount,
    row.total_amount,
    snap?.payable_amount,
    row.raw_amount,
  );
}

function resolveOrderPaidAmount(row = {}) {
  const payable = resolveOrderPayableAmount(row);
  const paid = firstPositiveNumber(row.paid_amount);
  if (paid > 0) return paid;
  const status = String(row.payment_status || '');
  if (['paid', 'partially_refunded', 'refunded'].includes(status)) return payable;
  return 0;
}

module.exports = {
  resolveOrderPayableAmount,
  resolveOrderPaidAmount,
};
