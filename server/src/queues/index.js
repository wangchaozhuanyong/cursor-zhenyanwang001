const { Queue, QueueEvents, Worker } = require('bullmq');
const { buildRedisOptions, getRedisKeyPrefix } = require('../config/redis');

const queues = new Map();
const workers = new Set();
const queueEvents = new Set();
let warnedQueueError = false;

function envInt(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function getQueuePrefix() {
  return (process.env.BULLMQ_PREFIX || `${getRedisKeyPrefix()}:bull`).trim();
}

function getDefaultJobOptions() {
  return {
    attempts: envInt('BULLMQ_JOB_ATTEMPTS', 3),
    backoff: {
      type: 'exponential',
      delay: envInt('BULLMQ_JOB_BACKOFF_MS', 1000),
    },
    removeOnComplete: envInt('BULLMQ_REMOVE_ON_COMPLETE', 1000),
    removeOnFail: envInt('BULLMQ_REMOVE_ON_FAIL', 5000),
  };
}

function assertQueueName(name) {
  if (!name || typeof name !== 'string') {
    throw new Error('queue name is required');
  }
}

function warnQueueError(err) {
  if (warnedQueueError) return;
  warnedQueueError = true;
  console.warn(`[BullMQ] ${err.message}`);
}

function attachQueueErrorLogger(instance) {
  if (instance && typeof instance.on === 'function') {
    instance.on('error', warnQueueError);
  }
  if (instance && instance.connection && typeof instance.connection.on === 'function') {
    instance.connection.on('error', warnQueueError);
  }
  if (instance && instance.client && typeof instance.client.catch === 'function') {
    instance.client.catch(warnQueueError);
  }
  if (instance && instance.connection && instance.connection.initializing) {
    instance.connection.initializing.catch(warnQueueError);
  }
  if (instance && instance.connection && instance.connection._client && typeof instance.connection._client.catch === 'function') {
    instance.connection._client.catch(warnQueueError);
  }
  return instance;
}

function buildBullMqOptions(options = {}) {
  const {
    connection = buildRedisOptions({ maxRetriesPerRequest: null }),
    defaultJobOptions = {},
    prefix = getQueuePrefix(),
    ...rest
  } = options;

  return {
    connection,
    prefix,
    defaultJobOptions: {
      ...getDefaultJobOptions(),
      ...defaultJobOptions,
    },
    ...rest,
  };
}

function createQueue(name, options = {}) {
  assertQueueName(name);
  const queue = attachQueueErrorLogger(new Queue(name, buildBullMqOptions(options)));
  queues.set(name, queue);
  return queue;
}

function getQueue(name, options = {}) {
  assertQueueName(name);
  if (!queues.has(name)) {
    return createQueue(name, options);
  }
  return queues.get(name);
}

async function addJob(queueName, jobName, data = {}, options = {}) {
  if (!jobName || typeof jobName !== 'string') {
    throw new Error('job name is required');
  }
  return getQueue(queueName).add(jobName, data, options);
}

function createWorker(name, processor, options = {}) {
  assertQueueName(name);
  if (typeof processor !== 'function' && typeof processor !== 'string') {
    throw new Error('worker processor must be a function or file path');
  }

  const worker = attachQueueErrorLogger(new Worker(name, processor, buildBullMqOptions(options)));
  workers.add(worker);
  worker.once('closed', () => workers.delete(worker));
  return worker;
}

function createQueueEvents(name, options = {}) {
  assertQueueName(name);
  const events = attachQueueErrorLogger(new QueueEvents(name, buildBullMqOptions(options)));
  queueEvents.add(events);
  events.once('closed', () => queueEvents.delete(events));
  return events;
}

async function forceDisconnect(instance) {
  if (!instance) return;
  if (instance.connection && instance.connection.initializing) {
    await instance.connection.initializing.catch(() => {});
  }
  if (typeof instance.close === 'function') {
    await Promise.resolve(instance.close(true)).catch(() => {});
    return;
  }
  if (typeof instance.disconnect === 'function') {
    await Promise.resolve(instance.disconnect()).catch(() => {});
  }
  if (instance.connection && typeof instance.connection.disconnect === 'function') {
    instance.connection.disconnect();
  }
  if (instance.connection && instance.connection._client) {
    const client = await Promise.resolve(instance.connection._client).catch(() => undefined);
    if (client && typeof client.disconnect === 'function') {
      client.disconnect();
    }
  }
}

async function closeQueues() {
  const closers = [
    ...Array.from(workers, (worker) => forceDisconnect(worker)),
    ...Array.from(queueEvents, (events) => forceDisconnect(events)),
    ...Array.from(queues.values(), (queue) => forceDisconnect(queue)),
  ];

  await Promise.allSettled(closers);
  workers.clear();
  queueEvents.clear();
  queues.clear();
}

module.exports = {
  addJob,
  buildBullMqOptions,
  closeQueues,
  createQueue,
  createQueueEvents,
  createWorker,
  getDefaultJobOptions,
  getQueue,
  getQueuePrefix,
};
