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
      summary: `用户申请售后 订单 ${req.body?.order_id || ''}`.trim(),
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
      summary: '用户申请售后失败',
      result: 'failure',
      errorMessage: err?.message || String(err),
    });
    throw err;
  }
});

async function runUserReturnAction(req, res, actionType, summary, action) {
  try {
    const result = await action();
    await writeAuditLog({
      req,
      operatorId: req.user.id,
      actionType,
      objectType: 'return_request',
      objectId: req.params.id,
      summary,
      after: { return_id: req.params.id },
      result: 'success',
    });
    res.success(result.data, result.message || '处理成功');
  } catch (err) {
    await writeAuditLog({
      req,
      operatorId: req.user?.id,
      actionType,
      objectType: 'return_request',
      objectId: req.params.id,
      summary: `${summary}失败`,
      result: 'failure',
      errorMessage: err?.message || String(err),
    });
    throw err;
  }
}

exports.cancelReturn = asyncRoute(async (req, res) => {
  await runUserReturnAction(req, res, 'return.cancel', '用户取消售后', () => (
    returnService.cancelReturn(req.user.id, req.params.id, req.body)
  ));
});

exports.supplementEvidence = asyncRoute(async (req, res) => {
  await runUserReturnAction(req, res, 'return.evidence_add', '用户补充售后凭证', () => (
    returnService.supplementEvidence(req.user.id, req.params.id, req.body)
  ));
});

exports.submitLogistics = asyncRoute(async (req, res) => {
  await runUserReturnAction(req, res, 'return.logistics_submit', '用户提交退货物流', () => (
    returnService.submitReturnLogistics(req.user.id, req.params.id, req.body)
  ));
});

exports.confirmCompleted = asyncRoute(async (req, res) => {
  await runUserReturnAction(req, res, 'return.confirm_complete', '用户确认售后完成', () => (
    returnService.confirmReturnCompleted(req.user.id, req.params.id)
  ));
});
