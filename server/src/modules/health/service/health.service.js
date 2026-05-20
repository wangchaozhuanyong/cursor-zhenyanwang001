const repo = require('../repository/health.repository');
const { getRedisUrl, pingRedis } = require('../../../config/redis');
const { getInstanceInfo } = require('../../../config/instance');

function isRedisConfigured() {
  return Boolean(
    getRedisUrl()
    || (process.env.REDIS_HOST || '').trim(),
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

function getLivenessPayload() {
  return {
    status: 'live',
    uptime: Math.floor(process.uptime()),
    node: process.version,
    env: process.env.NODE_ENV || 'development',
    instance: getInstanceInfo(),
  };
}

async function getReadinessPayload() {
  let database = false;
  try {
    await repo.ping();
    database = true;
  } catch {
    return { ok: false, data: { database: false, redis: null, instance: getInstanceInfo() } };
  }

  const redis = await getRedisReadiness();
  const isProd = process.env.NODE_ENV === 'production';
  const redisRequired = isProd && redis.configured;

  if (redisRequired && !redis.ok) {
    return {
      ok: false,
      data: {
        database: true,
        redis: false,
        redisConfigured: true,
        instance: getInstanceInfo(),
      },
    };
  }

  return {
    ok: true,
    data: {
      status: 'ready',
      database: true,
      redis: redis.skipped ? 'not_configured' : redis.ok,
      ...(redis.configured && redis.latencyMs != null ? { redisLatencyMs: redis.latencyMs } : {}),
      instance: getInstanceInfo(),
    },
  };
}

module.exports = {
  getLivenessPayload,
  getReadinessPayload,
};
