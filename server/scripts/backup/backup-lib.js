const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const { pipeline } = require('stream/promises');
const zlib = require('zlib');
const { spawn } = require('child_process');
const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');

const serverRoot = path.resolve(__dirname, '../..');
const repoRoot = path.resolve(serverRoot, '..');

function nowStamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function parseArgs(argv = process.argv.slice(2)) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const item = argv[i];
    if (!item.startsWith('--')) continue;
    const key = item.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) out[key] = true;
    else {
      out[key] = next;
      i += 1;
    }
  }
  return out;
}

function getBackupDir(...parts) {
  return path.join(process.env.BACKUP_LOCAL_DIR || path.join(serverRoot, 'backups'), ...parts);
}

async function ensureDir(dir) {
  await fsp.mkdir(dir, { recursive: true });
}

function requireSecret(name, { allowLocalOnly = false } = {}) {
  const value = process.env[name];
  if (value) return value;
  if (allowLocalOnly && process.env.BACKUP_ALLOW_LOCAL_ONLY === '1') return '';
  throw new Error(`${name} is required`);
}

function getEncryptionKey() {
  const raw = requireSecret('BACKUP_ENCRYPTION_KEY', { allowLocalOnly: true });
  const seed = raw || 'dev-local-backup-key-change-me';
  if (process.env.NODE_ENV === 'production' && !raw) {
    throw new Error('BACKUP_ENCRYPTION_KEY is required in production');
  }
  return crypto.createHash('sha256').update(seed).digest();
}

async function gzipFile(inputPath, outputPath) {
  await pipeline(
    fs.createReadStream(inputPath),
    zlib.createGzip({ level: 6 }),
    fs.createWriteStream(outputPath),
  );
}

async function encryptFile(inputPath, outputPath) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  await pipeline(fs.createReadStream(inputPath), cipher, fs.createWriteStream(outputPath));
  const tag = cipher.getAuthTag();
  await fsp.writeFile(`${outputPath}.meta.json`, JSON.stringify({
    algorithm: 'aes-256-gcm',
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    keyId: process.env.BACKUP_ENCRYPTION_KEY_ID || 'default',
  }, null, 2));
}

async function decryptFile(inputPath, outputPath, metaPath = `${inputPath}.meta.json`) {
  const meta = JSON.parse(await fsp.readFile(metaPath, 'utf8'));
  if (meta.algorithm !== 'aes-256-gcm') throw new Error(`Unsupported encryption algorithm: ${meta.algorithm}`);
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    getEncryptionKey(),
    Buffer.from(meta.iv, 'base64'),
  );
  decipher.setAuthTag(Buffer.from(meta.tag, 'base64'));
  await pipeline(fs.createReadStream(inputPath), decipher, fs.createWriteStream(outputPath));
}

async function gunzipFile(inputPath, outputPath) {
  await pipeline(
    fs.createReadStream(inputPath),
    zlib.createGunzip(),
    fs.createWriteStream(outputPath),
  );
}

async function sha256File(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { ...options, shell: process.platform === 'win32' });
    let stderr = '';
    child.stderr?.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with ${code}: ${stderr.slice(-2000)}`));
    });
  });
}

function s3Client() {
  return new S3Client({
    region: process.env.BACKUP_S3_REGION || process.env.AWS_REGION || 'ap-southeast-1',
    endpoint: process.env.BACKUP_S3_ENDPOINT || undefined,
    forcePathStyle: process.env.BACKUP_S3_FORCE_PATH_STYLE === '1',
  });
}

function getObjectLockRetainUntilDate() {
  if (process.env.BACKUP_S3_OBJECT_LOCK_UNTIL) {
    return new Date(process.env.BACKUP_S3_OBJECT_LOCK_UNTIL);
  }
  const mode = process.env.BACKUP_S3_OBJECT_LOCK_MODE;
  if (!mode) return undefined;
  const days = Math.max(1, Number(process.env.BACKUP_S3_OBJECT_LOCK_DAYS || 30) || 30);
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

async function uploadObject(filePath, key) {
  const bucket = process.env.BACKUP_S3_BUCKET || '';
  if (!bucket) {
    if (process.env.BACKUP_ALLOW_LOCAL_ONLY === '1') return { bucket: '', key, skipped: true };
    throw new Error('BACKUP_S3_BUCKET is required');
  }
  const body = fs.createReadStream(filePath);
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ServerSideEncryption: process.env.BACKUP_S3_SSE || undefined,
    ObjectLockMode: process.env.BACKUP_S3_OBJECT_LOCK_MODE || undefined,
    ObjectLockRetainUntilDate: getObjectLockRetainUntilDate(),
  });
  await s3Client().send(command);
  return { bucket, key, skipped: false };
}

async function downloadObject({ bucket, key, outputPath }) {
  if (!bucket) throw new Error('bucket is required for object download');
  const res = await s3Client().send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  if (!res.Body) throw new Error(`S3 object has empty body: ${bucket}/${key}`);
  await pipeline(res.Body, fs.createWriteStream(outputPath));
}

async function fileStat(filePath) {
  const stat = await fsp.stat(filePath);
  return { sizeBytes: stat.size };
}

async function pathExists(filePath) {
  try {
    await fsp.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function removeFileQuietly(filePath) {
  if (!filePath) return;
  await fsp.rm(filePath, { force: true }).catch(() => {});
}

async function removeTreeQuietly(dirPath) {
  if (!dirPath) return;
  await fsp.rm(dirPath, { recursive: true, force: true }).catch(() => {});
}

async function findExistingParent(dirPath) {
  let current = path.resolve(dirPath || '.');
  while (!(await pathExists(current))) {
    const next = path.dirname(current);
    if (next === current) return current;
    current = next;
  }
  return current;
}

function defaultMinFreeBytes(extraBytes = 0) {
  const configured = Number(process.env.BACKUP_MIN_FREE_BYTES || 1024 * 1024 * 1024);
  const base = Number.isFinite(configured) && configured > 0 ? configured : 1024 * 1024 * 1024;
  return Math.max(base, Number(extraBytes) || 0);
}

async function getAvailableBytes(dirPath) {
  if (typeof fsp.statfs !== 'function') return null;
  const target = await findExistingParent(dirPath);
  const stat = await fsp.statfs(target);
  return Number(stat.bavail) * Number(stat.bsize);
}

async function assertMinFreeBytes(dirPath, minBytes, label = 'backup') {
  const available = await getAvailableBytes(dirPath);
  if (available == null) return;
  const required = Number(minBytes) > 0 ? Number(minBytes) : defaultMinFreeBytes();
  if (available < required) {
    throw new Error(`${label} aborted: low disk space. available=${available} required=${required}`);
  }
}

function dbEnvArgs() {
  const args = [
    `--host=${process.env.DB_HOST || 'localhost'}`,
    `--port=${process.env.DB_PORT || '3306'}`,
    `--user=${process.env.DB_USER || 'click_send_app'}`,
  ];
  if (process.env.DB_PASSWORD) args.push(`--password=${process.env.DB_PASSWORD}`);
  return args;
}

function dbAdminArgs() {
  const args = [
    `--host=${process.env.RESTORE_DB_HOST || process.env.DB_HOST || 'localhost'}`,
    `--port=${process.env.RESTORE_DB_PORT || process.env.DB_PORT || '3306'}`,
    `--user=${process.env.RESTORE_DB_USER || process.env.DB_USER || 'click_send_app'}`,
  ];
  const password = process.env.RESTORE_DB_PASSWORD || process.env.DB_PASSWORD;
  if (password) args.push(`--password=${password}`);
  return args;
}

module.exports = {
  repoRoot,
  serverRoot,
  nowStamp,
  parseArgs,
  getBackupDir,
  ensureDir,
  gzipFile,
  gunzipFile,
  encryptFile,
  decryptFile,
  sha256File,
  runCommand,
  uploadObject,
  downloadObject,
  fileStat,
  removeFileQuietly,
  removeTreeQuietly,
  defaultMinFreeBytes,
  getAvailableBytes,
  assertMinFreeBytes,
  dbEnvArgs,
  dbAdminArgs,
};
