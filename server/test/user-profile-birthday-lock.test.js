const test = require('node:test');
const assert = require('node:assert/strict');
const { formatUserResponse } = require('../src/utils/formatUserResponse');

test('formatUserResponse clears locked birthday flag when birthday is empty', () => {
  const result = formatUserResponse({
    birthday: null,
    birthday_locked: 1,
  }, 'user');

  assert.equal(result.birthday, null);
  assert.equal(result.birthday_locked, false);
  assert.equal(result.birthdayLocked, false);
});

test('formatUserResponse keeps locked birthday flag when birthday exists', () => {
  const result = formatUserResponse({
    birthday: '1990-01-02 12:34:56',
    birthday_locked: 1,
  }, 'user');

  assert.equal(result.birthday, '1990-01-02');
  assert.equal(result.birthday_locked, true);
  assert.equal(result.birthdayLocked, true);
});

test('formatUserResponse treats invalid birthday as empty and clears lock', () => {
  const result = formatUserResponse({
    birthday: '1990-1-2',
    birthday_locked: 1,
  }, 'user');

  assert.equal(result.birthday, null);
  assert.equal(result.birthday_locked, false);
  assert.equal(result.birthdayLocked, false);
});
