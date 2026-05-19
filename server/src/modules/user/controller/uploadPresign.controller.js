const presignService = require('../service/uploadPresign.service');
const { writeAuditLog } = require('../../../utils/auditLog');

exports.createTicket = async (req, res) => {
  try {
    const result = await presignService.createUploadTicket(req.user.id, req.body);
    await writeAuditLog({
      req,
      operatorId: req.user.id,
      actionType: 'upload.presign_ticket',
      objectType: 'upload',
      objectId: result.data?.objectKey || null,
      summary: 'Create presigned upload ticket',
      after: {
        objectKey: result.data?.objectKey,
        mimeType: result.data?.mimeType,
        expiresAt: result.data?.expiresAt,
      },
      result: 'success',
    });
    return res.success(result.data);
  } catch (error) {
    const statusCode = Number(error?.statusCode || error?.status || 500);
    const message = error instanceof Error ? error.message : 'Failed to create upload ticket';
    await writeAuditLog({
      req,
      operatorId: req.user?.id,
      actionType: 'upload.presign_ticket',
      objectType: 'upload',
      summary: 'Create presigned upload ticket failed',
      result: 'failure',
      errorMessage: message,
    });
    return res.fail(statusCode, message);
  }
};

exports.completeUpload = async (req, res) => {
  try {
    const result = await presignService.completeUpload(req.user.id, req.body);
    await writeAuditLog({
      req,
      operatorId: req.user.id,
      actionType: 'upload.presign_complete',
      objectType: 'upload',
      objectId: result.data?.filename || null,
      summary: 'Complete presigned upload',
      after: { url: result.data?.url, filename: result.data?.filename },
      result: 'success',
    });
    return res.success(result.data);
  } catch (error) {
    const statusCode = Number(error?.statusCode || error?.status || 500);
    const message = error instanceof Error ? error.message : 'Failed to complete upload';
    await writeAuditLog({
      req,
      operatorId: req.user?.id,
      actionType: 'upload.presign_complete',
      objectType: 'upload',
      summary: 'Complete presigned upload failed',
      result: 'failure',
      errorMessage: message,
    });
    return res.fail(statusCode, message);
  }
};

