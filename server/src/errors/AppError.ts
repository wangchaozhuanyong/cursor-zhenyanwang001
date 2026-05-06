/**
 * 统一错误体系（业务可预期错误）
 *
 * 所有“可被前端按 code/message 渲染”的错误都应继承 AppError。
 * 错误处理中间件 (`server/src/middleware/errorHandler.js`) 会按 statusCode
 * 输出 `{ code, message, data, traceId }` 形式响应。
 *
 * 兼容历史 BusinessError：通过 `name === 'BusinessError'` 判断同样可用，
 * 因为本类把 name 设置为 'BusinessError' 以保持运行期兼容。
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: number;
  public readonly details?: unknown;
  public readonly expose: boolean;

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.name = 'BusinessError';
    this.statusCode = statusCode;
    this.code = statusCode;
    this.details = details;
    this.expose = true;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

/** 400 — 入参/校验错误 */
export class ValidationError extends AppError {
  constructor(message: string = '参数校验失败', details?: unknown) {
    super(400, message, details);
    this.name = 'ValidationError';
  }
}

/** 401 — 未认证 */
export class AuthError extends AppError {
  constructor(message: string = '请先登录') {
    super(401, message);
    this.name = 'AuthError';
  }
}

/** 403 — 无权限 */
export class ForbiddenError extends AppError {
  constructor(message: string = '无权限执行此操作') {
    super(403, message);
    this.name = 'ForbiddenError';
  }
}

/** 404 — 资源不存在 */
export class NotFoundError extends AppError {
  constructor(message: string = '资源不存在') {
    super(404, message);
    this.name = 'NotFoundError';
  }
}

/** 409 — 资源冲突 */
export class ConflictError extends AppError {
  constructor(message: string = '资源冲突') {
    super(409, message);
    this.name = 'ConflictError';
  }
}

/** 429 — 触发限流 */
export class RateLimitError extends AppError {
  constructor(message: string = '请求过于频繁，请稍后再试') {
    super(429, message);
    this.name = 'RateLimitError';
  }
}

/** 503 — 服务不可用 */
export class ServiceUnavailableError extends AppError {
  constructor(message: string = '服务暂不可用') {
    super(503, message);
    this.name = 'ServiceUnavailableError';
  }
}
