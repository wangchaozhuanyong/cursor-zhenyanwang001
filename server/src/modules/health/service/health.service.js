const repo = require('../repository/health.repository');
const { getRedisUrl, pingRedis } = require('../../../config/redis');
const { getInstanceInfo } = require('../../../config/instance');

function isRedisConfigured() {
  return Boolean(
    getRedisUrl()
    || (process.env.REDIS_HOST || '').trim()
    || process.env.REDIS_ENABLED === '1',
  );
}

async function getRedisReadiness() {
  if (!isRedisConfigured()) {
    return { configured: false, ok: true, skipped: true };
  }
  try {
    const ping = await pingRedis();
    return { configured: true, ok: ping.ok, latencyMs: ping.latencyMs };
  } catch {
    return { configured: true, ok: false };
  }
}

function isVerboseHealthProbe() {
  return String(process.env.HEALTH_PROBE_VERBOSE || '').trim() === '1';
}

function getLivenessPayload() {
  const payload = {
    status: 'live',
    uptime: Math.floor(process.uptime()),
  };
  if (isVerboseHealthProbe()) {
    payload.node = process.version;
    payload.env = process.env.NODE_ENV || 'development';
    payload.instance = getInstanceInfo();
  }
  return payload;
}

async function getReadinessPayload() {
  let database = false;
  try {
    await repo.ping();
    database = true;
  } catch {
    const data = { database: false, redis: null };
    if (isVerboseHealthProbe()) data.instance = getInstanceInfo();
    return { ok: false, data };
  }

  const redis = await getRedisReadiness();
  const isProd = process.env.NODE_ENV === 'production';
  const redisRequired = isProd && redis.configured;

  if (redisRequired && !redis.ok) {
    const data = {
      database: true,
      redis: false,
      redisConfigured: true,
    };
    if (isVerboseHealthProbe()) data.instance = getInstanceInfo();
    return { ok: false, data };
  }

  const data = {
    status: 'ready',
    database: true,
    redis: redis.skipped ? 'not_configured' : redis.ok,
  };
  if (isVerboseHealthProbe()) {
    data.instance = getInstanceInfo();
    if (redis.configured && redis.latencyMs != null) data.redisLatencyMs = redis.latencyMs;
  }
  return { ok: true, data };
}

module.exports = {
  getLivenessPayload,
  getReadinessPayload,
};
