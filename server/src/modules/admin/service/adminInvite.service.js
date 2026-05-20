const repo = require('../repository/adminInvite.repository');

async function listInvites(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize, 10) || 20));
  const total = await repo.countUsersWithParentInvite(query);
  const offset = (page - 1) * pageSize;
  const list = await repo.selectInviteRowsPage(query, pageSize, offset);
  const summary = await repo.selectInviteSummary(query);
  return { kind: 'paginate', list, total, page, pageSize, summary };
}

module.exports = { listInvites };







