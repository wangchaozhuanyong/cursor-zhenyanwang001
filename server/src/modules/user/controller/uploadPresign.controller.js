const presignService = require('../service/uploadPresign.service');
const { writeAuditLog } = require('../../../utils/auditLog');

function buildUploadContext(req, uploadSource) {
  const originalUrl = String(req.originalUrl || req.url || '');
  return {
    uploaderType: originalUrl.startsWith('/api/admin/') ? 'admin' : 'user',
    uploadSource,
  };
}

exports.createTicket = async (req, res) => {
  try {
    const result = await presignService.createUploadTicket(req.user.id, req.body);
    await writeAuditLog({
      req,
      operatorId: req.user.id,
      actionType: 'upload.presign_ticket',
      objectType: 'upload',
      objectId: result.data?.objectKey || null,
      summary: '签发预签名上传凭证',
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
    const message = error instanceof Error ? error.message : '创建上传凭证失败';
    await writeAuditLog({
      req,
      operatorId: req.user?.id,
      actionType: 'upload.presign_ticket',
      objectType: 'upload',
      summary: '签发预签名上传凭证失败',
      result: 'failure',
      errorMessage: message,
    });
    return res.fail(statusCode, message);
  }
};

exports.completeUpload = async (req, res) => {
  try {
    const result = await presignService.completeUpload(
      req.user.id,
      req.body,
      buildUploadContext(req, 'presign_complete'),
    );
    await writeAuditLog({
      req,
      operatorId: req.user.id,
      actionType: 'upload.presign_complete',
      objectType: 'upload',
      objectId: result.data?.filename || null,
      summary: '预签名上传完成并发布',
      after: { url: result.data?.url, filename: result.data?.filename },
      result: 'success',
    });
    return res.success(result.data);
  } catch (error) {
    const statusCode = Number(error?.statusCode || error?.status || 500);
    const message = error instanceof Error ? error.message : '完成上传失败';
    await writeAuditLog({
      req,
      operatorId: req.user?.id,
      actionType: 'upload.presign_complete',
      objectType: 'upload',
      summary: '预签名上传完成失败',
      result: 'failure',
      errorMessage: message,
    });
    return res.fail(statusCode, message);
  }
};
