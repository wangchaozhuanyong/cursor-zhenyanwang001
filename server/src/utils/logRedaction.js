const util = require('util');

const REDACTED = '[REDACTED]';
const MAX_DEPTH = 6;
const SENSITIVE_KEY_RE = /(?:password|passwd|pwd|token|secret|api[_-]?key|access[_-]?key|refresh[_-]?token|authorization|cookie|set-cookie|credential|private[_-]?key|signature|jwt)/i;
const HEADER_NAME_RE = /\b(authorization|cookie|set-cookie|x-api-key|api-key)\b\s*:\s*([^\r\n]+)/gi;
const JSON_KEY_VALUE_RE = /("?(?:password|passwd|pwd|token|secret|api[_-]?key|access[_-]?key|refresh[_-]?token|authorization|cookie|set-cookie|credential|private[_-]?key|signature|jwt)"?\s*:\s*")([^"]*)(")/gi;
const KEY_VALUE_RE = /\b(password|passwd|pwd|token|secret|api[_-]?key|access[_-]?key|refresh[_-]?token|authorization|cookie|set-cookie|signature|jwt)\b(\s*[=:]\s*)([^&\s,"'}]+)/gi;
const QUERY_VALUE_RE = /([?&](?:password|passwd|pwd|token|secret|api[_-]?key|access[_-]?key|refresh[_-]?token|authorization|signature|jwt)=)([^&#\s]+)/gi;
const BEARER_RE = /\b(Bearer\s+)[A-Za-z0-9._~+/=-]{12,}/gi;
const JWT_RE = /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g;
const OPENAI_KEY_RE = /\bsk-[A-Za-z0-9_-]{12,}\b/g;
const AWS_ACCESS_KEY_RE = /\bAKIA[0-9A-Z]{16}\b/g;

let consoleRedactionInstalled = false;

function redactString(value) {
  return String(value)
    .replace(HEADER_NAME_RE, (_m, key) => `${key}: ${REDACTED}`)
    .replace(JSON_KEY_VALUE_RE, (_m, prefix, _value, suffix) => `${prefix}${REDACTED}${suffix}`)
    .replace(QUERY_VALUE_RE, (_m, prefix) => `${prefix}${REDACTED}`)
    .replace(KEY_VALUE_RE, (_m, key, sep) => `${key}${sep}${REDACTED}`)
    .replace(BEARER_RE, (_m, prefix) => `${prefix}${REDACTED}`)
    .replace(JWT_RE, REDACTED)
    .replace(OPENAI_KEY_RE, REDACTED)
    .replace(AWS_ACCESS_KEY_RE, REDACTED);
}

function sanitizeLogValue(value, depth = 0, seen = new WeakSet()) {
  if (value == null) return value;
  if (typeof value === 'string') return redactString(value);
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') return value;
  if (typeof value === 'function') return `[Function ${value.name || 'anonymous'}]`;
  if (Buffer.isBuffer(value)) return `[Buffer length=${value.length}]`;
  if (value instanceof Error) {
    const err = /** @type {Error & { code?: unknown, status?: unknown, statusCode?: unknown }} */ (value);
    return {
      name: err.name,
      message: redactString(err.message || ''),
      stack: redactString(err.stack || ''),
      code: err.code,
      status: err.status,
      statusCode: err.statusCode,
    };
  }
  if (typeof value !== 'object') return redactString(util.inspect(value));
  if (depth >= MAX_DEPTH) return '[MaxDepth]';
  if (seen.has(value)) return '[Circular]';

  seen.add(value);
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeLogValue(item, depth + 1, seen));
  }

  const output = {};
  for (const [key, item] of Object.entries(value)) {
    output[key] = SENSITIVE_KEY_RE.test(key) ? REDACTED : sanitizeLogValue(item, depth + 1, seen);
  }
  return output;
}

function safeStringifyForLog(value) {
  try {
    if (typeof value === 'string') return redactString(value);
    return JSON.stringify(sanitizeLogValue(value));
  } catch {
    return redactString(util.inspect(value));
  }
}

function installConsoleRedaction(target = console) {
  if (consoleRedactionInstalled) return;
  consoleRedactionInstalled = true;
  for (const method of ['debug', 'error', 'info', 'log', 'warn']) {
    const original = target[method];
    if (typeof original !== 'function') continue;
    target[method] = (...args) => original.apply(target, args.map((arg) => sanitizeLogValue(arg)));
  }
}

module.exports = {
  REDACTED,
  redactString,
  sanitizeLogValue,
  safeStringifyForLog,
  installConsoleRedaction,
};
