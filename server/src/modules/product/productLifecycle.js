/** 商品生命周期：0 草稿 · 1 上架 · 2 下架（与 varchar status 双写兼容） */

const LIFECYCLE = {
  DRAFT: 0,
  ON_SHELF: 1,
  OFF_SHELF: 2,
};

function normalizeLifecycleFromRow(row) {
  if (!row) return LIFECYCLE.ON_SHELF;
  if (row.lifecycle_status != null && row.lifecycle_status !== '') {
    const n = Number(row.lifecycle_status);
    if (n === 0 || n === 1 || n === 2) return n;
  }
  const s = row.status;
  if (s === 'active') return LIFECYCLE.ON_SHELF;
  if (s === 'draft') return LIFECYCLE.DRAFT;
  return LIFECYCLE.OFF_SHELF;
}

function statusVarcharFromLifecycle(lc) {
  if (lc === LIFECYCLE.DRAFT) return 'draft';
  if (lc === LIFECYCLE.ON_SHELF) return 'active';
  return 'inactive';
}

/** 列表筛选：支持 draft / active / inactive 或 0 / 1 / 2 */
function lifecycleFromFilter(status) {
  if (status === undefined || status === null || status === '') return null;
  const s = String(status).trim();
  if (s === 'active' || s === '1') return LIFECYCLE.ON_SHELF;
  if (s === 'draft' || s === '0') return LIFECYCLE.DRAFT;
  if (s === 'inactive' || s === '2') return LIFECYCLE.OFF_SHELF;
  return null;
}

function lifecycleFromBody(body) {
  if (body.lifecycle_status !== undefined && body.lifecycle_status !== null) {
    const n = Number(body.lifecycle_status);
    if (n === 0 || n === 1 || n === 2) return n;
  }
  if (body.status !== undefined && body.status !== null) {
    const lc = lifecycleFromFilter(body.status);
    if (lc !== null) return lc;
  }
  return null;
}

module.exports = {
  LIFECYCLE,
  normalizeLifecycleFromRow,
  statusVarcharFromLifecycle,
  lifecycleFromFilter,
  lifecycleFromBody,
};
