const crypto = require('crypto');
const { getRedisClient, getRedisKeyPrefix } = require('../config/redis');

const RELEASE_SCRIPT = `
if redis.call("GET", KEYS[1]) == ARGV[1] then
  return redis.call("DEL", KEYS[1])
end
return 0
`;

const EXTEND_SCRIPT = `
if redis.call("GET", KEYS[1]) == ARGV[1] then
  return redis.call("PEXPIRE", KEYS[1], ARGV[2])
end
return 0
`;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function positiveNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function lockKey(resource) {
  if (!resource) throw new Error('lock resource is required');
  const prefix = getRedisKeyPrefix();
  return `${prefix}:lock:${String(resource).replace(/^:+/, '')}`;
}

function createToken() {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return crypto.randomBytes(16).toString('hex');
}

function createLockHandle(redis, key, token, ttlMs) {
  let released = false;

  return {
    key,
    token,
    ttlMs,
    async release() {
      if (released) return false;
      const result = await redis.eval(RELEASE_SCRIPT, 1, key, token);
      released = true;
      return result === 1;
    },
    async extend(nextTtlMs = ttlMs) {
      if (released) return false;
      const ttl = positiveNumber(nextTtlMs, ttlMs);
      const result = await redis.eval(EXTEND_SCRIPT, 1, key, token, ttl);
      return result === 1;
    },
  };
}

async function acquireLock(resource, options = {}) {
  const redis = options.redis || getRedisClient();
  const key = options.key || lockKey(resource);
  const token = options.token || createToken();
  const ttlMs = positiveNumber(options.ttlMs || process.env.REDIS_LOCK_TTL_MS, 30000);
  const retryDelayMs = positiveNumber(options.retryDelayMs || process.env.REDIS_LOCK_RETRY_DELAY_MS, 100);
  const timeoutMs = Math.max(0, Number(options.timeoutMs || 0));
  const deadline = timeoutMs > 0 ? Date.now() + timeoutMs : 0;

  do {
    const result = await redis.set(key, token, 'PX', ttlMs, 'NX');
    if (result === 'OK') {
      return createLockHandle(redis, key, token, ttlMs);
    }

    if (!deadline || Date.now() >= deadline) {
      return null;
    }

    const remaining = deadline - Date.now();
    const jitter = Math.floor(Math.random() * Math.min(25, retryDelayMs));
    await sleep(Math.min(retryDelayMs + jitter, remaining));
  } while (Date.now() < deadline);

  return null;
}

async function releaseLock(lock) {
  if (!lock || typeof lock.release !== 'function') return false;
  return lock.release();
}

async function withLock(resource, options, fn) {
  const run = typeof options === 'function' ? options : fn;
  const lockOptions = typeof options === 'function' ? {} : options || {};
  if (typeof run !== 'function') {
    throw new Error('lock callback is required');
  }

  const lock = await acquireLock(resource, lockOptions);
  if (!lock) {
    /** @type {Error & { code?: string }} */
    const err = new Error(`Failed to acquire lock: ${resource}`);
    err.code = 'LOCK_NOT_ACQUIRED';
    throw err;
  }

  try {
    return await run(lock);
  } finally {
    await lock.release();
  }
}

module.exports = {
  acquireLock,
  lockKey,
  releaseLock,
  withLock,
};
