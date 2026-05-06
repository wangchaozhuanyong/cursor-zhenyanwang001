/**
 * 异步路由包装器
 *
 * 仅负责把 Promise 拒绝转交给 next(err)，所有错误在 errorHandler 统一映射。
 * 历史曾在此处直接 res.fail(BusinessError) —— 现在统一交给 errorHandler，
 * 避免响应分裂、支持 ValidationError / NotFoundError / ZodError 等子类。
 *
 * @template T
 * @param {(req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => Promise<T>|T} handler
 */
function asyncRoute(handler) {
  return function asyncRouteWrapped(req, res, next) {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

module.exports = { asyncRoute };
