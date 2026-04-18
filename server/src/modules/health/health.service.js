const repo = require('./health.repository');

function getLivenessPayload() {
  return {
    status: 'live',
    uptime: Math.floor(process.uptime()),
    node: process.version,
    env: process.env.NODE_ENV || 'development',
  };
}

async function getReadinessPayload() {
  try {
    await repo.ping();
    return { ok: true, data: { status: 'ready', database: true } };
  } catch {
    return { ok: false, data: { database: false } };
  }
}

module.exports = {
  getLivenessPayload,
  getReadinessPayload,
};
