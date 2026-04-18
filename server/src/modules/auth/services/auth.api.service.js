/**
 * 对外基础认证 API 业务入口（门面），委托给 auth.service
 */
const authService = require('../auth.service');

async function register(body) {
  return authService.register(body);
}

async function login(body) {
  return authService.login(body);
}

module.exports = {
  register,
  login,
};
