const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

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

async function uploadBufferToS3({ key, body, contentType = 'application/octet-stream', cacheControl = 'public, max-age=31536000, immutable' }) {
  const conf = getS3Config();
  assertS3Config(conf);
  const storageKey = buildStorageKey(key);
  const client = new S3Client({
    region: conf.region,
    endpoint: conf.endpoint || undefined,
    forcePathStyle: conf.forcePathStyle,
    credentials: {
      accessKeyId: conf.accessKeyId,
      secretAccessKey: conf.secretAccessKey,
    },
  });
  await client.send(
    new PutObjectCommand({
      Bucket: conf.bucket,
      Key: storageKey,
      Body: body,
      ContentType: contentType,
      CacheControl: cacheControl,
    }),
  );
  return {
    key: storageKey,
    url: getPublicUrlByKey(storageKey),
  };
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
  getStorageHealthReport,
};
