/** 业务可预期错误（4xx/503），由 controller 映射为 res.fail */
class BusinessError extends Error {
  /**
   * @param {number} code HTTP 状态码或与 res.fail 一致的业务码
   * @param {string} message
   */
  constructor(code, message) {
    super(message);
    this.code = code;
    this.name = 'BusinessError';
  }
}

module.exports = { BusinessError };
