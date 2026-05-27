const authService = require('./auth.service');

async function register(body, options = {}) {
  return authService.register(body, options);
}

async function login(body, options = {}) {
  return authService.login(body, options);
}

module.exports = {
  register,
  login,
};
