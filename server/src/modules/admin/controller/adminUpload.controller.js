function getUserApi() {
  return /** @type {any} */ (require('../../user')).api || {};
}

function requireUserApi(name) {
  const fn = getUserApi()[name];
  if (typeof fn !== 'function') {
    throw new Error(`User 模块 API 未暴露方法：${name}`);
  }
  return fn;
}

exports.uploadMiddleware = (req, res, next) => requireUserApi('uploadMiddleware')(req, res, next);
exports.uploadMultiple = (req, res, next) => requireUserApi('uploadMultiple')(req, res, next);
exports.uploadFile = (req, res, next) => requireUserApi('uploadFile')(req, res, next);
exports.uploadFiles = (req, res, next) => requireUserApi('uploadFiles')(req, res, next);
exports.createTicket = (req, res, next) => requireUserApi('createUploadTicket')(req, res, next);
exports.completeUpload = (req, res, next) => requireUserApi('completeUpload')(req, res, next);
