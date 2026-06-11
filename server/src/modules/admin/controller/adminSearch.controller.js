const { asyncRoute } = require('../../../middleware/asyncRoute');
const searchApi = /** @type {any} */ (require('../../search')).api || {};

exports.listTerms = asyncRoute(async (req, res) => {
  res.success(await searchApi.listAdminSearchTerms(req.query || {}));
});

exports.createTerm = asyncRoute(async (req, res) => {
  res.success(await searchApi.saveAdminSearchTerm(req.body || {}), '保存成功');
});

exports.updateTerm = asyncRoute(async (req, res) => {
  res.success(await searchApi.updateAdminSearchTerm(req.params.id, req.body || {}), '保存成功');
});

exports.deleteTerm = asyncRoute(async (req, res) => {
  res.success(await searchApi.removeAdminSearchTerm(req.params.id), '删除成功');
});
