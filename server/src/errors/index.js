/**
 * 统一错误模型聚合出口
 *
 * - AppError: 所有业务错误的基类（statusCode + code + message）
 * - ValidationError / AuthError / ForbiddenError / NotFoundError /
 *   ConflictError / RateLimitError / ServiceUnavailableError: 常用语义子类
 * - BusinessError: 历史名字别名，等价于 AppError，保持向后兼容
 */
const {
  AppError,
  ValidationError,
  AuthError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  ServiceUnavailableError,
} = require('./AppError');

/**
 * 历史 BusinessError 行为：`new BusinessError(code, message)`
 * 等价于 `new AppError(code, message)`。
 */
class BusinessError extends AppError {
  /**
   * @param {number} code
   * @param {string} message
   */
  constructor(code, message) {
    super(code, message);
    this.name = 'BusinessError';
  }
}

module.exports = {
  AppError,
  BusinessError,
  ValidationError,
  AuthError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  ServiceUnavailableError,
};
