const authModule = require('../../auth');

function getAuthApi() {
  return /** @type {any} */ (authModule).api || {};
}

function requireAuthApi(name) {
  const fn = getAuthApi()[name];
  if (typeof fn !== 'function') {
    throw new Error(`Auth module API missing method: ${name}`);
  }
  return fn;
}

async function getProfile(userId) {
  return requireAuthApi('getProfile')(userId);
}

async function updateProfile(userId, body) {
  return requireAuthApi('updateProfile')(userId, body);
}

async function changePassword(userId, body) {
  return requireAuthApi('changePassword')(userId, body);
}

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
};
