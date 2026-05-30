const fs = require('fs');
const path = require('path');
const { safeStringifyForLog } = require('../utils/logRedaction');

function safeStringify(value) {
  return safeStringifyForLog(value);
}

function ensureDir(dirPath) {
  try {
    fs.mkdirSync(dirPath, { recursive: true });
  } catch {
    // ignore
  }
}

/**
 * 将错误按 traceId 落盘，便于线上排查。
 * 默认写入 <server>/logs/runtime-errors.log（与 PM2 logs 同目录）
 */
function appendRuntimeError({ traceId, err, req }) {
  try {
    const logsDir = path.join(__dirname, '..', 'logs');
    ensureDir(logsDir);
    const filePath = path.join(logsDir, 'runtime-errors.log');
    const line = [
      new Date().toISOString(),
      `traceId=${traceId || '-'}`,
      `method=${req?.method || '-'}`,
      `path=${req?.originalUrl || req?.url || '-'}`,
      `ip=${req?.ip || '-'}`,
      `ua=${safeStringify(req?.headers?.['user-agent'] || '-')}`,
      `error=${safeStringify(err?.stack || err)}`,
    ].join(' ') + '\n';
    fs.appendFileSync(filePath, line, 'utf8');
  } catch {
    // ignore
  }
}

module.exports = { appendRuntimeError };
