const test = require('node:test');
const assert = require('node:assert/strict');

const { getAccessTokenFromRequest } = require('../src/utils/authCookies');

test('getAccessTokenFromRequest tolerates malformed cookie encoding', () => {
  const req = {
    headers: {
      cookie: 'bad=%E0%A4%A; access_token=good-token',
    },
  };

  const token = getAccessTokenFromRequest(req);
  assert.equal(token, 'good-token');
});


