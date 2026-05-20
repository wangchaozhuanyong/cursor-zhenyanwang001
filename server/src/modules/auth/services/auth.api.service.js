/**
 * 瀵瑰鍩虹璁よ瘉 API 涓氬姟鍏ュ彛锛堥棬闈級锛屽鎵樼粰 auth.service
 */
const authService = require('../service/auth.service');

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
