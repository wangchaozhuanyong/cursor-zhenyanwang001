// @ts-nocheck
const { getRedisClient, getRedisKeyPrefix } = require('../config/redis');

let warnedCacheError = false;

function isCacheEnabled() {
  return process.env.REDIS_CACHE_ENABLED !== '0';
}

function defaultTtlSeconds() {
  const value = Number(process.env.REDIS_CACHE_TTL_SECONDS);
  return Number.isFinite(value) && value > 0 ? value : 300;
}

function normalizeTtlSeconds(ttl) {
  if (ttl === undefined || ttl === null) return defaultTtlSeconds();
  const value = Number(ttl);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

function cacheKey(key, namespace = 'cache') {
  if (!key) throw new Error('cache key is required');
  const prefix = getRedisKeyPrefix();
  return `${prefix}:${namespace}:${String(key).replace(/^:+/, '')}`;
}

function warnCacheError(err) {
  if (warnedCacheError) return;
  warnedCacheError = true;
  console.warn(`[RedisCache] ${err.message}`);
}

function serializeValue(value, raw = false) {
  if (value === undefined) {
    throw new Error('cache value cannot be undefined');
  }
  return raw ? String(value) : JSON.stringify(value);
}

function deserializeValue(payload, raw = false) {
  if (payload === null || payload === undefined) return undefined;
  if (raw) return payload;
  try {
    return JSON.parse(payload);
  } catch {
    return payload;
  }
}

async function getCache(key, options = {}) {
  if (!isCacheEnabled()) return options.fallback;
  try {
    const payload = await getRedisClient().get(cacheKey(key, options.namespace));
    return payload == null
      ? options.fallback
      : deserializeValue(payload, options.raw);
  } catch (err) {
    warnCacheError(err);
    return options.fallback;
  }
}

async function setCache(key, value, ttlOrOptions = undefined) {
  if (!isCacheEnabled()) return false;

  const options = typeof ttlOrOptions === 'object' && ttlOrOptions !== null
    ? ttlOrOptions
    : { ttl: ttlOrOptions };

  try {
    const redis = getRedisClient();
    const fullKey = cacheKey(key, options.namespace);
    const payload = serializeValue(value, options.raw);
    const ttl = normalizeTtlSeconds(options.ttl);

    if (ttl > 0) {
      await redis.set(fullKey, payload, 'EX', ttl);
    } else {
      await redis.set(fullKey, payload);
    }
    return true;
  } catch (err) {
    warnCacheError(err);
    return false;
  }
}

function popDeleteNamespaceOption(args) {
  if (args.length === 0) return { keyParts: [], namespace: undefined };
  const last = args[args.length - 1];
  if (
    last &&
    typeof last === 'object' &&
    !Array.isArray(last) &&
    Object.prototype.hasOwnProperty.call(last, 'namespace')
  ) {
    return {
      keyParts: args.slice(0, -1),
      namespace: last.namespace,
    };
  }
  return { keyParts: args, namespace: undefined };
}

async function deleteCache(...keys) {
  if (!isCacheEnabled()) return 0;
  const { keyParts, namespace } = popDeleteNamespaceOption(keys);
  const flattened = keyParts.flat().filter(Boolean);
  if (flattened.length === 0) return 0;

  try {
    const ns = namespace === undefined ? 'cache' : namespace;
    const fullKeys = flattened.map((key) => cacheKey(key, ns));
    return await getRedisClient().del(fullKeys);
  } catch (err) {
    warnCacheError(err);
    return 0;
  }
}

async function clearCacheByPattern(pattern, options = {}) {
  if (!isCacheEnabled()) return 0;

  const redis = getRedisClient();
  const match = cacheKey(pattern || '*', options.namespace);
  const count = Number(options.count) > 0 ? Number(options.count) : 100;
  let cursor = '0';
  let deleted = 0;

  try {
    do {
      const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', match, 'COUNT', count);
      cursor = nextCursor;
      if (keys.length > 0) {
        deleted += await redis.del(keys);
      }
    } while (cursor !== '0');
    return deleted;
  } catch (err) {
    warnCacheError(err);
    return deleted;
  }
}

async function rememberCache(key, ttlOrOptions, loader) {
  const options = typeof ttlOrOptions === 'object' && ttlOrOptions !== null
    ? ttlOrOptions
    : { ttl: ttlOrOptions };
  const load = typeof loader === 'function' ? loader : options.loader;
  if (typeof load !== 'function') {
    throw new Error('cache loader is required');
  }

  const cached = await getCache(key, { ...options, fallback: undefined });
  if (cached !== undefined) return cached;

  const value = await load();
  await setCache(key, value, options);
  return value;
}

module.exports = {
  cacheKey,
  clearCacheByPattern,
  del: deleteCache,
  deleteCache,
  get: getCache,
  getCache,
  remember: rememberCache,
  rememberCache,
  set: setCache,
  setCache,
};
