const repo = require('./auditLog.repository');

const SORTABLE = new Set(['created_at', 'action_type', 'result']);

async function listAuditLogs(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize, 10) || 20));
  const sortBy = SORTABLE.has(query.sortBy) ? query.sortBy : 'created_at';
  const sortOrder = String(query.sortOrder || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC';
  const orderSql = `ORDER BY ${sortBy} ${sortOrder}`;

  const { where, params } = repo.buildWhere(query);
  const total = await repo.countAuditLogs(where, params);
  const offset = (page - 1) * pageSize;
  const list = await repo.selectAuditLogsPage(where, params, orderSql, pageSize, offset);
  return { kind: 'paginate', list, total, page, pageSize };
}

module.exports = { listAuditLogs };
