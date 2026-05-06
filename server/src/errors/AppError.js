/**
 * Runtime JS counterpart for AppError.ts.
 * Keeps CommonJS server startup working in production without ts-node.
 */
class AppError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.name = 'BusinessError';
    this.statusCode = statusCode;
    this.code = statusCode;
    this.details = details;
    this.expose = true;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message = '参数校验失败', details) {
    super(400, message, details);
    this.name = 'ValidationError';
  }
}

class AuthError extends AppError {
  constructor(message = '请先登录') {
    super(401, message);
    this.name = 'AuthError';
  }
}

class ForbiddenError extends AppError {
  constructor(message = '无权限执行此操作') {
    super(403, message);
    this.name = 'ForbiddenError';
  }
}

class NotFoundError extends AppError {
  constructor(message = '资源不存在') {
    super(404, message);
    this.name = 'NotFoundError';
  }
}

class ConflictError extends AppError {
  constructor(message = '资源冲突') {
    super(409, message);
    this.name = 'ConflictError';
  }
}

class RateLimitError extends AppError {
  constructor(message = '请求过于频繁，请稍后再试') {
    super(429, message);
    this.name = 'RateLimitError';
  }
}

class ServiceUnavailableError extends AppError {
  constructor(message = '服务暂不可用') {
    super(503, message);
    this.name = 'ServiceUnavailableError';
  }
}

module.exports = {
  AppError,
  ValidationError,
  AuthError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  ServiceUnavailableError,
};
