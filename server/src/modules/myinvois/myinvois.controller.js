const { asyncRoute } = require('../../middleware/asyncRoute');
const service = require('./myinvois.service');

exports.getStatus = asyncRoute(async (_req, res) => {
  const result = await service.getStatusAdmin();
  res.success(result.data);
});

exports.updateProfile = asyncRoute(async (req, res) => {
  const result = await service.updateProfileAdmin(req, req.body);
  res.success(null, result.message);
});

exports.listDocuments = asyncRoute(async (req, res) => {
  const result = await service.listDocumentsAdmin(req.query);
  res.paginate(result.list, result.total, result.page, result.pageSize);
});

exports.getDocument = asyncRoute(async (req, res) => {
  const result = await service.getDocumentAdmin(req.params.id);
  res.success(result.data);
});

exports.retryDocument = asyncRoute(async (req, res) => {
  const result = await service.retryDocumentAdmin(req.params.id);
  res.success(null, result.message);
});

exports.submitDocument = asyncRoute(async (req, res) => {
  const result = await service.submitDocumentAdmin(req.params.id);
  res.success(null, result.message);
});

exports.processPending = asyncRoute(async (req, res) => {
  const result = await service.processPendingBatch(req.body?.limit);
  res.success(result, 'MyInvois 队列处理完成');
});

exports.createReconciliation = asyncRoute(async (req, res) => {
  const result = await service.createReconciliationAdmin(req, req.body);
  res.success(result.data, result.message);
});
