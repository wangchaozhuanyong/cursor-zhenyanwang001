/** Â??Â?ÅÁ??Â?ΩÂ?®Ê??Ôº? Ëç?Á®ø ¬∑ 1 ‰∏?Ê?∂ ¬∑ 2 ‰∏?Ê?∂Ôº?‰∏? varchar status Âè?Â??Â?ºÂÆπÔº?*/

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

/** Â??Ë°®Á≠?È??Ôº?Ê?ØÊ?Å draft / active / inactive Ê??0 / 1 / 2 */
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

/** Public on-sale filter for bare `products` table (legacy lifecycle + status compat). */
const ACTIVE_PRODUCT_WHERE =
  "(lifecycle_status = 1 OR (lifecycle_status IS NULL AND status = 'active')) AND deleted_at IS NULL";

/** Same rule with optional table alias, e.g. activeProductWhere('p') for JOINs. */
function activeProductWhere(tableAlias = '') {
  const p = tableAlias ? `${tableAlias}.` : '';
  return `(${p}lifecycle_status = 1 OR (${p}lifecycle_status IS NULL AND ${p}status = 'active')) AND ${p}deleted_at IS NULL`;
}

module.exports = {
  LIFECYCLE,
  normalizeLifecycleFromRow,
  statusVarcharFromLifecycle,
  lifecycleFromFilter,
  lifecycleFromBody,
  ACTIVE_PRODUCT_WHERE,
  activeProductWhere,
};

