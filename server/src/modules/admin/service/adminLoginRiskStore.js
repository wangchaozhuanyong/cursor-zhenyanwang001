const crypto = require('crypto');
const { getRedisClient, getRedisKeyPrefix, getRedisUrl } = require('../../../config/redis');

function positiveNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

const LOCK_FAILURE_THRESHOLD = positiveNumber(process.env.ADMIN_LOGIN_LOCK_FAILURES, 10);
const LOCK_MS = positiveNumber(process.env.ADMIN_LOGIN_LOCK_MINUTES, 30) * 60 * 1000;
const RISK_WINDOW_MS = positiveNumber(process.env.ADMIN_LOGIN_RISK_WINDOW_MINUTES, 60) * 60 * 1000;
const memoryState = new Map();
let warnedRedisFailure = false;

function isRedisRiskStoreEnabled() {
  const mode = String(process.env.ADMIN_LOGIN_RISK_STORE || '').trim().toLowerCase();
  if (mode === 'memory') return false;
  if (mode === 'redis') return true;
  if (process.env.NODE_ENV === 'production') return true;
  return Boolean(
    getRedisUrl()
    || String(process.env.REDIS_HOST || '').trim()
    || process.env.REDIS_ENABLED === '1',
  );
}

function warnRedisFailure(err) {
  if (warnedRedisFailure) return;
  warnedRedisFailure = true;
  console.warn(`[admin-login-risk] Redis unavailable, falling back to in-memory risk state: ${err?.message || err}`);
}

function hashPart(value) {
  return crypto.createHash('sha256').update(String(value || 'unknown').toLowerCase()).digest('hex').slice(0, 32);
}

function scopedKey(kind, key) {
  const [scope, value] = String(key || '').split(/:(.*)/s);
  const safeScope = String(scope || 'unknown').replace(/[^a-z0-9_-]/gi, '_').toLowerCase();
  const prefix = getRedisKeyPrefix();
  return `${prefix}:admin-login-risk:${kind}:${safeScope}:${hashPart(value)}`;
}

function getMemoryRecord(key) {
  const now = Date.now();
  const record = memoryState.get(key);
  if (
    !record
    || (record.expiresAt && record.expiresAt <= now)
    || (record.lockedUntil && record.lockedUntil <= now)
  ) {
    const fresh = { failures: 0, lockedUntil: 0, expiresAt: now + RISK_WINDOW_MS };
    memoryState.set(key, fresh);
    return fresh;
  }
  return record;
}

async function getRedisSnapshot(keys) {
  const client = getRedisClient();
  if (client.status === 'wait') await client.connect();
  const failKeys = keys.map((key) => scopedKey('fail', key));
  const lockKeys = keys.map((key) => scopedKey('lock', key));
  const [failures, locks] = await Promise.all([
    client.mget(failKeys),
    client.mget(lockKeys),
  ]);
  return {
    maxFailures: failures.reduce((max, value) => Math.max(max, Number(value) || 0), 0),
    locked: locks.some(Boolean),
  };
}

function getMemorySnapshot(keys) {
  const now = Date.now();
  let maxFailures = 0;
  let locked = false;
  for (const key of keys) {
    const record = getMemoryRecord(key);
    maxFailures = Math.max(maxFailures, record.failures);
    if (record.lockedUntil && record.lockedUntil > now) locked = true;
  }
  return { maxFailures, locked };
}

async function getSnapshot(keys) {
  if (!isRedisRiskStoreEnabled()) return getMemorySnapshot(keys);
  try {
    return await getRedisSnapshot(keys);
  } catch (err) {
    warnRedisFailure(err);
    return getMemorySnapshot(keys);
  }
}

async function recordRedisFailure(keys) {
  const client = getRedisClient();
  if (client.status === 'wait') await client.connect();
  const pipeline = client.pipeline();
  const failKeys = keys.map((key) => scopedKey('fail', key));
  for (const key of failKeys) {
    pipeline.incr(key);
    pipeline.pexpire(key, RISK_WINDOW_MS);
  }
  const results = await pipeline.exec();
  const counts = results
    .filter(([, value], index) => index % 2 === 0)
    .map(([, value]) => Number(value) || 0);
  const shouldLock = counts.some((count) => count >= LOCK_FAILURE_THRESHOLD);
  if (shouldLock) {
    const lockPipeline = client.pipeline();
    for (const key of keys) {
      lockPipeline.set(scopedKey('lock', key), '1', 'PX', LOCK_MS);
    }
    await lockPipeline.exec();
  }
}

function recordMemoryFailure(keys) {
  const now = Date.now();
  for (const key of keys) {
    const record = getMemoryRecord(key);
    record.failures += 1;
    record.expiresAt = now + RISK_WINDOW_MS;
    if (record.failures >= LOCK_FAILURE_THRESHOLD) {
      record.lockedUntil = now + LOCK_MS;
    }
    memoryState.set(key, record);
  }
}

async function recordFailure(keys) {
  if (!isRedisRiskStoreEnabled()) return recordMemoryFailure(keys);
  try {
    await recordRedisFailure(keys);
  } catch (err) {
    warnRedisFailure(err);
    recordMemoryFailure(keys);
  }
}

async function clearRedis(keys) {
  const client = getRedisClient();
  if (client.status === 'wait') await client.connect();
  await client.del(keys.flatMap((key) => [scopedKey('fail', key), scopedKey('lock', key)]));
}

async function clear(keys) {
  if (isRedisRiskStoreEnabled()) {
    try {
      await clearRedis(keys);
    } catch (err) {
      warnRedisFailure(err);
    }
  }
  for (const key of keys) memoryState.delete(key);
}

module.exports = {
  clear,
  getSnapshot,
  isRedisRiskStoreEnabled,
  recordFailure,
};
