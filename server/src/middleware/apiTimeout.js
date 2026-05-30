const DEFAULT_TIMEOUT_MS = 30 * 1000;

function readTimeoutMs() {
  const value = Number(process.env.API_REQUEST_TIMEOUT_MS);
  if (!Number.isFinite(value)) return DEFAULT_TIMEOUT_MS;
  return Math.max(0, Math.floor(value));
}

function apiTimeout(options = {}) {
  const timeoutMs = Number.isFinite(Number(options.timeoutMs))
    ? Math.max(0, Math.floor(Number(options.timeoutMs)))
    : readTimeoutMs();

  return function apiTimeoutMiddleware(req, res, next) {
    if (timeoutMs <= 0) return next();

    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);
    let didTimeout = false;

    const timer = setTimeout(() => {
      if (res.headersSent || res.writableEnded) return;
      didTimeout = true;
      req.apiTimedOut = true;
      const traceId = req.traceId || '';
      res.status(504).type('application/json');
      originalSend(JSON.stringify({ code: 504, message: '请求处理超时，请稍后再试', data: null, traceId }));
    }, timeoutMs);

    function cleanup() {
      clearTimeout(timer);
    }

    res.on('finish', cleanup);
    res.on('close', cleanup);

    res.json = function timeoutAwareJson(...args) {
      if (didTimeout || req.apiTimedOut || res.writableEnded) return res;
      return originalJson(...args);
    };

    res.send = function timeoutAwareSend(...args) {
      if (didTimeout || req.apiTimedOut || res.writableEnded) return res;
      return originalSend(...args);
    };

    return next();
  };
}

module.exports = apiTimeout;
