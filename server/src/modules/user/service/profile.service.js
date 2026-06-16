const authApi = /** @type {any} */ (require('../../auth/publicApi'));

function getAuthApi() {
  return authApi || {};
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
