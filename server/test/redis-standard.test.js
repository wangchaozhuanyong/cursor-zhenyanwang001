// @ts-nocheck
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');

const { closeRedis, createRedisConnection } = require('../src/config/redis');
const cache = require('../src/utils/cache');
const lock = require('../src/utils/lock');
const queues = require('../src/queues');

async function tryRedis() {
  const client = createRedisConnection({ connectTimeout: 1500, maxRetriesPerRequest: 1 }, 'test');
  try {
    await client.connect();
    const pong = await client.ping();
    return { ok: pong === 'PONG', client };
  } catch {
    await client.quit().catch(() => client.disconnect());
    return { ok: false, client: null };
  }
}

describe('Redis / cache / lock / queue standard modules', () => {
  let redisAvailable = false;
  let testClient;

  before(async () => {
    if (process.env.SKIP_REDIS_INTEGRATION === '1') return;
    const r = await tryRedis();
    redisAvailable = r.ok;
    testClient = r.client;
  });

  after(async () => {
    if (testClient) {
      await testClient.quit().catch(() => testClient.disconnect());
    }
    await queues.closeQueues();
    await closeRedis();
  });

  it('loads without throwing', () => {
    assert.equal(typeof cache.getCache, 'function');
    assert.equal(typeof lock.acquireLock, 'function');
    assert.equal(typeof queues.createQueue, 'function');
  });

  it('deleteCache respects trailing { namespace } option', () => {
    const k = cache.cacheKey('x', 'orders');
    assert.match(k, /:orders:x$/);
  });

  it('cache + lock + queue with live Redis', async (t) => {
    if (!redisAvailable) {
      t.skip('Redis 鏈繍琛屾垨涓嶅彲杈撅紙璁剧疆 SKIP_REDIS_INTEGRATION=1 鍙烦杩囨湰妫€娴嬶級');
      return;
    }

    process.env.REDIS_CACHE_ENABLED = '1';
    const suffix = `t-${Date.now()}`;
    const testCacheKey = `std-${suffix}`;
    const lockResource = `std-lock-${suffix}`;
    const queueName = `std-q-${suffix}`;

    await cache.deleteCache(testCacheKey, { namespace: 'integration' });
    const setOk = await cache.setCache(testCacheKey, { n: 1 }, { ttl: 60, namespace: 'integration' });
    assert.equal(setOk, true);
    const got = await cache.getCache(testCacheKey, { namespace: 'integration' });
    assert.deepEqual(got, { n: 1 });
    const delCount = await cache.deleteCache(testCacheKey, { namespace: 'integration' });
    assert.equal(delCount, 1);

    const handle = await lock.acquireLock(lockResource, { redis: testClient, ttlMs: 5000 });
    assert.ok(handle);
    const second = await lock.acquireLock(lockResource, { redis: testClient, ttlMs: 5000, timeoutMs: 50 });
    assert.equal(second, null);
    assert.equal(await handle.release(), true);

    queues.createQueue(queueName);
    const job = await queues.addJob(queueName, 'ping', { hello: true }, { removeOnComplete: true });
    assert.ok(job.id);
    await queues.closeQueues();
  });
});

