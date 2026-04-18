/**
 * 包装异步路由：捕获 BusinessError → res.fail，其余 → next(err)
 */
function asyncRoute(handler) {
  return function asyncRouteWrapped(req, res, next) {
    Promise.resolve(handler(req, res, next)).catch((err) => {
      if (err && err.name === 'BusinessError') {
        return res.fail(err.code, err.message);
      }
      next(err);
    });
  };
}

module.exports = { asyncRoute };
