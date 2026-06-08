const { AsyncLocalStorage } = require('async_hooks');

const storage = new AsyncLocalStorage();

function createPerfContext() {
  return {
    startedAt: process.hrtime.bigint(),
    dbDurationMs: 0,
    dbQueries: 0,
    cacheHit: undefined,
  };
}

function runWithRequestPerf(callback) {
  return storage.run(createPerfContext(), callback);
}

function getRequestPerf() {
  return storage.getStore() || null;
}

function recordDbDuration(durationMs) {
  const ctx = getRequestPerf();
  if (!ctx) return;
  ctx.dbDurationMs += Number(durationMs || 0);
  ctx.dbQueries += 1;
}

function setCacheHit(value) {
  const ctx = getRequestPerf();
  if (!ctx) return;
  ctx.cacheHit = value;
}

module.exports = {
  runWithRequestPerf,
  getRequestPerf,
  recordDbDuration,
  setCacheHit,
};
