const repo = require('./adminInvite.repository');

async function listInvites(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(query.pageSize, 10) || 20));
  const total = await repo.countUsersWithParentInvite();
  const offset = (page - 1) * pageSize;
  const list = await repo.selectInviteRowsPage(pageSize, offset);
  return { kind: 'paginate', list, total, page, pageSize };
}

module.exports = { listInvites };
