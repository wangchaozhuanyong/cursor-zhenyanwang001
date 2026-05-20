// @ts-nocheck
const Redis = require('ioredis');
const { instanceLogPrefix } = require('./instance');

let redisClient;
let warnedConnectionError = false;

function envInt(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function envBool(name, fallback = false) {
  const value = process.env[name];
  if (value === undefined || value === '') return fallback;
  return value === '1' || value === 'true';
}

function getRedisUrl() {
  return (process.env.REDIS_URL || process.env.REDIS_CONNECTION_STRING || '').trim();
}

function getRedisKeyPrefix() {
  return (process.env.REDIS_KEY_PREFIX || process.env.SITE_CODE || 'click-send-shop').trim().replace(/:+$/, '');
}

function applyRedisUrlOptions(options) {
  const url = getRedisUrl();
  if (!url) return options;

  const parsed = new URL(url);
  options.host = parsed.hostname || '127.0.0.1';
  options.port = parsed.port ? Number(parsed.port) : 6379;
  if (parsed.username) options.username = decodeURIComponent(parsed.username);
  if (parsed.password) options.password = decodeURIComponent(parsed.password);
  if (parsed.pathname && parsed.pathname !== '/') {
    const db = Number(parsed.pathname.slice(1));
    if (Number.isFinite(db)) options.db = db;
  }
  if (parsed.protocol === 'rediss:') {
    options.tls = options.tls || {};
  }

  return options;
}

function buildRedisOptions(overrides = {}) {
  const password = process.env.REDIS_PASSWORD || undefined;
  const db = envInt('REDIS_DB', 0);
  const tlsEnabled = envBool('REDIS_TLS', false);

  const options = {
    lazyConnect: true,
    enableReadyCheck: true,
    connectTimeout: envInt('REDIS_CONNECT_TIMEOUT_MS', 5000),
    maxRetriesPerRequest: envInt('REDIS_MAX_RETRIES_PER_REQUEST', 3),
    retryStrategy(times) {
      const maxDelay = envInt('REDIS_RETRY_MAX_DELAY_MS', 2000);
      return Math.min(times * 100, maxDelay);
    },
    ...overrides,
  };

  if (getRedisUrl()) {
    applyRedisUrlOptions(options);
  } else {
    options.host = process.env.REDIS_HOST || '127.0.0.1';
    options.port = envInt('REDIS_PORT', 6379);
    options.db = db;
    if (password) options.password = password;
  }

  if (tlsEnabled) {
    options.tls = options.tls || {};
  }

  return options;
}

function attachRedisLogger(client, label = 'default') {
  if (client.__clickSendShopLoggerAttached) return client;
  client.__clickSendShopLoggerAttached = true;

  client.on('connect', () => {
    warnedConnectionError = false;
  });

  client.on('error', (err) => {
    if (warnedConnectionError) return;
    warnedConnectionError = true;
    console.warn(`${instanceLogPrefix('Redis')} ${label} connection error: ${err.message}`);
  });

  return client;
}

function createRedisConnection(overrides = {}, label = 'default') {
  const options = buildRedisOptions(overrides);
  const client = new Redis(options);
  return attachRedisLogger(client, label);
}

function getRedisClient() {
  if (!redisClient) {
    redisClient = createRedisConnection({}, 'shared');
  }
  return redisClient;
}

function createBullMqConnection(overrides = {}) {
  return createRedisConnection(
    {
      maxRetriesPerRequest: null,
      ...overrides,
    },
    'bullmq',
  );
}

async function pingRedis(client = getRedisClient()) {
  const startedAt = Date.now();
  const response = await client.ping();
  return {
    ok: response === 'PONG',
    response,
    latencyMs: Date.now() - startedAt,
  };
}

async function closeRedis(client = redisClient) {
  if (!client) return;
  if (client.status === 'end') return;
  await client.quit().catch(() => client.disconnect());
  if (client === redisClient) {
    redisClient = undefined;
  }
}

module.exports = {
  buildRedisOptions,
  closeRedis,
  createBullMqConnection,
  createRedisConnection,
  getRedisClient,
  getRedisKeyPrefix,
  getRedisUrl,
  pingRedis,
};
