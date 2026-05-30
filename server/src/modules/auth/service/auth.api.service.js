const authService = require('./auth.service');

async function register(body) {
  return authService.register(body);
}

async function login(body, req) {
  return authService.login(body, req);
}

module.exports = {
  register,
  login,
};
