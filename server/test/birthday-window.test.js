const test = require('node:test');
const assert = require('node:assert/strict');
const { isInBirthdayWindow } = require('../src/utils/birthdayWindow');
const { filterPointsBonusActivitiesForUser } = require('../src/modules/loyalty/service/pointsBonusResolver.service');

test('isInBirthdayWindow includes anchor and after days', () => {
  assert.equal(isInBirthdayWindow('2024-06-05', '1990-06-05', 0, 7), true);
  assert.equal(isInBirthdayWindow('2024-06-12', '1990-06-05', 0, 7), true);
  assert.equal(isInBirthdayWindow('2024-06-13', '1990-06-05', 0, 7), false);
});

test('filterPointsBonusActivitiesForUser drops birthday activity without user birthday', () => {
  const filtered = filterPointsBonusActivitiesForUser([
    {
      activity_id: 'b1',
      activity_config: { bonus_kind: 'birthday', multiplier_percent: 200 },
    },
  ], { birthday: null, consumedBirthdayActivityIds: [] });
  assert.equal(filtered.length, 0);
});

test('filterPointsBonusActivitiesForUser drops consumed birthday activity', () => {
  const filtered = filterPointsBonusActivitiesForUser([
    {
      activity_id: 'b1',
      activity_config: {
        bonus_kind: 'birthday',
        multiplier_percent: 200,
        birthday_window_before_days: 0,
        birthday_window_after_days: 30,
        once_per_year: true,
      },
    },
  ], {
    birthday: '1990-06-05',
    today: '2024-06-05',
    consumedBirthdayActivityIds: ['b1'],
  });
  assert.equal(filtered.length, 0);
});
