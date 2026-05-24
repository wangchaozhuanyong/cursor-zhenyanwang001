const authService = require('./auth.service');

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
