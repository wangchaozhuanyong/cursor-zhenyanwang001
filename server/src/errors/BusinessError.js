/**
 * 历史保留：`BusinessError` 已迁移到 `server/src/errors/index.js`
 * 这里仅做转发，避免任何引用 `./errors/BusinessError` 的旧代码出错。
 *
 * 新代码请直接使用：
 *   const { BusinessError, ValidationError, ... } = require('../../errors');
 */
const { BusinessError } = require('./');

module.exports = { BusinessError };
