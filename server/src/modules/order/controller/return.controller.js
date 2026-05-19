const returnService = require('../service/return.service');
const { asyncRoute } = require('../../../middleware/asyncRoute');
const { writeAuditLog } = require('../../../utils/auditLog');

exports.getReturnRequests = asyncRoute(async (req, res) => {
  const result = await returnService.getReturnRequests(req.user.id, req.query);
  res.paginate(result.list, result.total, result.page, result.pageSize);
});

exports.getReturnById = asyncRoute(async (req, res) => {
  const result = await returnService.getReturnById(req.user.id, req.params.id);
  res.success(result.data);
});

exports.createReturn = asyncRoute(async (req, res) => {
  try {
    const result = await returnService.createReturn(req.user.id, req.body);
    await writeAuditLog({
      req,
      operatorId: req.user.id,
      actionType: 'return.create',
      objectType: 'return_request',
      objectId: result.data?.id || null,
      summary: `鐢ㄦ埛鐢宠鍞悗 璁㈠崟 ${req.body?.order_id || ''}`.trim(),
      after: { order_id: req.body?.order_id, type: req.body?.type, status: result.data?.status },
      result: 'success',
    });
    res.success(result.data, result.message);
  } catch (err) {
    await writeAuditLog({
      req,
      operatorId: req.user?.id,
      actionType: 'return.create',
      objectType: 'return_request',
      summary: '鐢ㄦ埛鐢宠鍞悗澶辫触',
      result: 'failure',
      errorMessage: err?.message || String(err),
    });
    throw err;
  }
});
