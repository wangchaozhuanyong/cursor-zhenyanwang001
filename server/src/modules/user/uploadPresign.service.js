const {
  isS3StorageEnabled,
  createPresignedPutUrl,
  buildRawUploadKey,
  buildStorageKey,
  assertRawObjectKeyOwnedByUser,
  headS3Object,
  getS3ObjectBuffer,
  deleteS3Object,
} = require('../../utils/objectStorage');
const { BusinessError } = require('../../errors');
const {
  IMAGE_MAX_SIZE,
  allowedImageMimes,
  writeMediaFromFile,
} = require('./uploadMedia.service');

/**
 * @param {string} userId
 * @param {{ mimeType: string, size: number, mode?: string }} body
 */
async function createUploadTicket(userId, body) {
  if (!isS3StorageEnabled()) {
    throw new BusinessError(
      503,
      '预签名上传仅在使用 STORAGE_DRIVER=s3 时可用，请改用直传接口或启用对象存储',
    );
  }

  const mimeType = String(body.mimeType || '').toLowerCase().trim();
  const size = Number(body.size);
  if (!allowedImageMimes.includes(mimeType)) {
    throw new BusinessError(400, '仅支持 image/jpeg、image/png、image/webp');
  }
  if (!Number.isFinite(size) || size <= 0 || size > IMAGE_MAX_SIZE) {
    throw new BusinessError(400, `文件大小须在 1 字节至 ${IMAGE_MAX_SIZE} 之间`);
  }

  const logicalKey = buildRawUploadKey(userId, mimeType);
  const storageKey = buildStorageKey(logicalKey);
  const ticket = await createPresignedPutUrl({
    key: logicalKey,
    contentType: mimeType,
    contentLength: size,
  });

  return {
    data: {
      uploadUrl: ticket.uploadUrl,
      objectKey: storageKey,
      mimeType,
      maxSize: IMAGE_MAX_SIZE,
      expiresIn: ticket.expiresIn,
      expiresAt: ticket.expiresAt,
      mode: String(body.mode || 'product').toLowerCase(),
    },
  };
}

/**
 * @param {string} userId
 * @param {{ objectKey: string, mode?: string, mimeType?: string }} body
 */
async function completeUpload(userId, body) {
  if (!isS3StorageEnabled()) {
    throw new BusinessError(503, '对象存储未启用');
  }

  const objectKey = String(body.objectKey || '').trim();
  if (!objectKey) throw new BusinessError(400, '缺少 objectKey');

  assertRawObjectKeyOwnedByUser(objectKey, userId);

  const head = await headS3Object(objectKey);
  const mimeType = String(body.mimeType || head.contentType || '').toLowerCase();
  if (!allowedImageMimes.includes(mimeType)) {
    throw new BusinessError(400, '对象类型不允许');
  }
  if (head.contentLength <= 0 || head.contentLength > IMAGE_MAX_SIZE) {
    throw new BusinessError(400, '对象大小无效');
  }

  const buffer = await getS3ObjectBuffer(objectKey);
  const extByMime = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
  const file = {
    buffer,
    size: buffer.length,
    mimetype: mimeType,
    originalname: `upload${extByMime[mimeType] || '.bin'}`,
  };

  const mode = String(body.mode || 'product').toLowerCase();
  const result = await writeMediaFromFile(file, mode);

  try {
    await deleteS3Object(objectKey);
  } catch (err) {
    console.warn(`[upload] delete raw object failed key=${objectKey}: ${err?.message || err}`);
  }

  return { data: result };
}

module.exports = {
  createUploadTicket,
  completeUpload,
};
