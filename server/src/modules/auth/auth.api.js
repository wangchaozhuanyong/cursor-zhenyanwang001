/**
 * Auth 域对外（其他业务域）暴露的程序内 API。
 * 与 HTTP 路由 `/api/auth/*` 使用同一套 service 实现，避免其他模块直接依赖 repository。
 */
const authService = require('./auth.service');

module.exports = {
  findUserByPhone: authService.findUserByPhone,
  findUserByPhones: authService.findUserByPhones,
  bumpRefreshTokenVersion: authService.bumpRefreshTokenVersion,
  changePassword: authService.changePassword,
  updateLastLogin: authService.updateLastLogin,
};
