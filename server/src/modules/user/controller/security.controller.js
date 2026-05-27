const { asyncRoute } = require('../../../middleware/asyncRoute');
const clientSecurity = require('../../security/service/clientSecurity.service');

exports.listSessions = asyncRoute(async (req, res) => {
  const list = await clientSecurity.listSessions(req.user.id);
  res.success({ list });
});

exports.revokeSession = asyncRoute(async (req, res) => {
  await clientSecurity.revokeSession(req.user.id, req.params.id);
  res.success(null, '会话已撤销');
});
