const {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { NodeHttpHandler } = require('@smithy/node-http-handler');
const crypto = require('crypto');

let cachedClient = null;
let cachedClientKey = '';

function normalizeBaseUrl(url) {
  return String(url || '').trim().replace(/\/+$/, '');
}

function isS3StorageEnabled() {
  return (process.env.STORAGE_DRIVER || '').trim().toLowerCase() === 's3';
}

function maskSecret(secret) {
  const raw = String(secret || '').trim();
  if (!raw) return '(empty)';
  if (raw.length <= 8) return `${raw.slice(0, 1)}***${raw.slice(-1)}`;
  return `${raw.slice(0, 4)}***${raw.slice(-4)}`;
}

function getS3Config() {
  return {
    endpoint: process.env.STORAGE_S3_ENDPOINT || undefined,
    region: process.env.STORAGE_S3_REGION || 'auto',
    bucket: process.env.STORAGE_S3_BUCKET || '',
    accessKeyId: process.env.STORAGE_S3_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.STORAGE_S3_SECRET_ACCESS_KEY || '',
    forcePathStyle: String(process.env.STORAGE_S3_FORCE_PATH_STYLE || 'false').toLowerCase() === 'true',
    publicBaseUrl: normalizeBaseUrl(process.env.STORAGE_PUBLIC_BASE_URL || ''),
    keyPrefix: String(process.env.STORAGE_KEY_PREFIX || '').trim().replace(/^\/+|\/+$/g, ''),
  };
}

function assertS3Config(conf) {
  const missing = [];
  if (!conf.bucket) missing.push('STORAGE_S3_BUCKET');
  if (!conf.accessKeyId) missing.push('STORAGE_S3_ACCESS_KEY_ID');
  if (!conf.secretAccessKey) missing.push('STORAGE_S3_SECRET_ACCESS_KEY');
  if (!conf.publicBaseUrl) missing.push('STORAGE_PUBLIC_BASE_URL');
  if (missing.length > 0) {
    throw new Error(`S3 配置缺失: ${missing.join(', ')}`);
  }
}

function buildStorageKey(key) {
  const conf = getS3Config();
  const prefix = conf.keyPrefix ? `${conf.keyPrefix}/` : '';
  return `${prefix}${String(key || '').replace(/^\/+/, '')}`;
}

function getPublicUrlByKey(key) {
  const conf = getS3Config();
  if (!conf.publicBaseUrl) return '';
  return `${conf.publicBaseUrl}/${String(key || '').replace(/^\/+/, '')}`;
}

function getS3Client() {
  const conf = getS3Config();
  assertS3Config(conf);
  const clientKey = JSON.stringify({
    endpoint: conf.endpoint || '',
    region: conf.region,
    bucket: conf.bucket,
    accessKeyId: conf.accessKeyId,
    forcePathStyle: conf.forcePathStyle,
  });
  if (!cachedClient || cachedClientKey !== clientKey) {
    cachedClient = new S3Client({
      region: conf.region,
      endpoint: conf.endpoint || undefined,
      forcePathStyle: conf.forcePathStyle,
      credentials: {
        accessKeyId: conf.accessKeyId,
        secretAccessKey: conf.secretAccessKey,
      },
      requestHandler: new NodeHttpHandler({
        connectionTimeout: 10_000,
        requestTimeout: 45_000,
      }),
    });
    cachedClientKey = clientKey;
  }
  return { client: cachedClient, conf };
}

async function uploadBufferToS3({ key, body, contentType = 'application/octet-stream', cacheControl = 'public, max-age=31536000, immutable' }) {
  const storageKey = buildStorageKey(key);
  const { client, conf } = getS3Client();
  try {
    await client.send(
      new PutObjectCommand({
        Bucket: conf.bucket,
        Key: storageKey,
        Body: body,
        ContentType: contentType,
        CacheControl: cacheControl,
      }),
    );
  } catch (error) {
    const code = String(error?.name || error?.code || '');
    if (code.includes('Timeout') || code.includes('Abort') || code.includes('ECONNRESET')) {
      throw new Error('S3 上传超时，请检查对象存储网络或配置');
    }
    throw error;
  }
  return {
    key: storageKey,
    url: getPublicUrlByKey(storageKey),
  };
}

function presignExpiresSeconds() {
  const raw = Number(process.env.UPLOAD_PRESIGN_EXPIRES_SEC || 300);
  if (!Number.isFinite(raw)) return 300;
  return Math.min(600, Math.max(60, Math.floor(raw)));
}

/**
 * @param {{ key: string, contentType: string, contentLength?: number }} params
 */
async function createPresignedPutUrl({ key, contentType, contentLength }) {
  if (!isS3StorageEnabled()) {
    throw new Error('对象存储未启用，无法签发预签名上传');
  }
  const storageKey = buildStorageKey(key);
  const { client, conf } = getS3Client();
  const command = new PutObjectCommand({
    Bucket: conf.bucket,
    Key: storageKey,
    ContentType: contentType,
    ...(Number.isFinite(contentLength) && contentLength > 0 ? { ContentLength: contentLength } : {}),
  });
  const expiresIn = presignExpiresSeconds();
  const uploadUrl = await getSignedUrl(client, command, { expiresIn });
  return {
    uploadUrl,
    objectKey: storageKey,
    expiresIn,
    expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
  };
}

async function headS3Object(storageKey) {
  const { client, conf } = getS3Client();
  const out = await client.send(new HeadObjectCommand({
    Bucket: conf.bucket,
    Key: storageKey,
  }));
  return {
    contentLength: Number(out.ContentLength || 0),
    contentType: String(out.ContentType || ''),
  };
}

async function getS3ObjectBuffer(storageKey) {
  const { client, conf } = getS3Client();
  const out = await client.send(new GetObjectCommand({
    Bucket: conf.bucket,
    Key: storageKey,
  }));
  const chunks = [];
  for await (const chunk of out.Body) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

async function deleteS3Object(storageKey) {
  const { client, conf } = getS3Client();
  await client.send(new DeleteObjectCommand({
    Bucket: conf.bucket,
    Key: storageKey,
  }));
}

async function listS3ObjectsByPrefix(prefix, options = {}) {
  const storagePrefix = buildStorageKey(prefix);
  const { client, conf } = getS3Client();
  const maxKeys = Math.min(1000, Math.max(1, Number(options.maxKeys || 1000)));
  const objects = [];
  let ContinuationToken;
  do {
    const out = await client.send(new ListObjectsV2Command({
      Bucket: conf.bucket,
      Prefix: storagePrefix,
      MaxKeys: maxKeys,
      ContinuationToken,
    }));
    for (const item of out.Contents || []) {
      if (!item.Key) continue;
      objects.push({
        key: item.Key,
        size: Number(item.Size || 0),
        lastModified: item.LastModified || null,
        url: getPublicUrlByKey(item.Key),
      });
    }
    ContinuationToken = out.IsTruncated ? out.NextContinuationToken : null;
  } while (ContinuationToken && objects.length < Math.max(maxKeys, Number(options.limit || 10000)));
  return objects;
}

async function deleteS3ObjectsBatch(keys, options = {}) {
  const safeKeys = [...new Set((keys || []).map((key) => String(key || '').trim()).filter(Boolean))];
  if (!safeKeys.length) return { deleted: 0, errors: [] };
  if (options.dryRun) return { deleted: safeKeys.length, errors: [] };
  const { client, conf } = getS3Client();
  let deleted = 0;
  const errors = [];
  for (let i = 0; i < safeKeys.length; i += 1000) {
    const batch = safeKeys.slice(i, i + 1000);
    const out = await client.send(new DeleteObjectsCommand({
      Bucket: conf.bucket,
      Delete: {
        Quiet: false,
        Objects: batch.map((Key) => ({ Key })),
      },
    }));
    deleted += (out.Deleted || []).length;
    for (const err of out.Errors || []) {
      errors.push({ key: err.Key, message: err.Message || err.Code || 'DELETE_FAILED' });
    }
  }
  return { deleted, errors };
}

function buildRawUploadKey(userId, mimeType) {
  const extByMime = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'image/avif': '.avif',
  };
  const ext = extByMime[mimeType] || '';
  const id = crypto.randomBytes(16).toString('hex');
  return `uploads/raw/${userId}/${id}${ext}`;
}

function assertRawObjectKeyOwnedByUser(storageKey, userId) {
  const prefix = buildStorageKey(`uploads/raw/${userId}/`);
  if (!String(storageKey || '').startsWith(prefix)) {
    const err = new Error('无权访问该上传对象');
    /** @type {any} */ (err).statusCode = 403;
    /** @type {any} */ (err).expose = true;
    throw err;
  }
}

function isTrustedPublicAssetUrl(url) {
  const conf = getS3Config();
  if (!conf.publicBaseUrl) return false;
  const normalized = String(url || '').trim();
  return normalized.startsWith(`${conf.publicBaseUrl}/`);
}

function getStorageHealthReport() {
  const driver = (process.env.STORAGE_DRIVER || '').trim().toLowerCase() || 'db';
  if (driver !== 's3') {
    return {
      driver,
      mode: 'db-inline',
      healthy: true,
      note: '未启用对象存储，站点图片将以内联 dataURL 存入数据库',
    };
  }

  const conf = getS3Config();
  const required = [
    'STORAGE_S3_BUCKET',
    'STORAGE_S3_ACCESS_KEY_ID',
    'STORAGE_S3_SECRET_ACCESS_KEY',
    'STORAGE_PUBLIC_BASE_URL',
  ];
  const missing = required.filter((k) => !(process.env[k] || '').trim());
  return {
    driver,
    mode: 's3',
    healthy: missing.length === 0,
    missing,
    endpoint: conf.endpoint || '(default aws endpoint)',
    region: conf.region,
    bucket: conf.bucket || '(empty)',
    publicBaseUrl: conf.publicBaseUrl || '(empty)',
    keyPrefix: conf.keyPrefix || '(none)',
    forcePathStyle: conf.forcePathStyle,
    accessKeyIdMasked: maskSecret(conf.accessKeyId),
    secretKeyMasked: maskSecret(conf.secretAccessKey),
  };
}

module.exports = {
  isS3StorageEnabled,
  uploadBufferToS3,
  createPresignedPutUrl,
  headS3Object,
  getS3ObjectBuffer,
  deleteS3Object,
  listS3ObjectsByPrefix,
  deleteS3ObjectsBatch,
  buildRawUploadKey,
  assertRawObjectKeyOwnedByUser,
  isTrustedPublicAssetUrl,
  getPublicUrlByKey,
  buildStorageKey,
  getStorageHealthReport,
};
