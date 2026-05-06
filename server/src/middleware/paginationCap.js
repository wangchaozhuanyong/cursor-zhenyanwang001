const { BusinessError } = require('../errors/BusinessError');

/**
 * 强制分页上限：limit/pageSize 最大不超过 max（默认 100）
 * - mode='clamp'：超过直接覆盖为 max
 * - mode='error'：超过返回 400
 */
function paginationCap({ max = 100, mode = 'clamp' } = {}) {
  return (req, res, next) => {
    const q = req.query || {};
    const keys = ['limit', 'pageSize'];
    for (const k of keys) {
      if (q[k] === undefined) continue;
      const n = parseInt(String(q[k]), 10);
      if (!Number.isFinite(n) || n <= 0) continue;
      if (n > max) {
        if (mode === 'error') {
          return next(new BusinessError(400, `${k} 不能超过 ${max}`));
        }
        req.query[k] = String(max);
      }
    }
    next();
  };
}

module.exports = { paginationCap };

