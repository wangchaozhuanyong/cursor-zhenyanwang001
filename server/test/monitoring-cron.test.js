const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const cronMatcher = require('../src/modules/monitoring/service/cronMatcher.service');

function at(parts) {
  return new Date(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, 0, 0);
}

describe('monitoring cronMatcher', () => {
  test('matches */30 minute schedule', () => {
    const expr = '*/30 * * * *';
    assert.equal(cronMatcher.matches(expr, at({ year: 2026, month: 5, day: 21, hour: 10, minute: 0 })), true);
    assert.equal(cronMatcher.matches(expr, at({ year: 2026, month: 5, day: 21, hour: 10, minute: 30 })), true);
    assert.equal(cronMatcher.matches(expr, at({ year: 2026, month: 5, day: 21, hour: 10, minute: 15 })), false);
  });

  test('matches daily hour schedule', () => {
    const expr = '0 3 * * *';
    assert.equal(cronMatcher.matches(expr, at({ year: 2026, month: 5, day: 21, hour: 3, minute: 0 })), true);
    assert.equal(cronMatcher.matches(expr, at({ year: 2026, month: 5, day: 21, hour: 3, minute: 1 })), false);
    assert.equal(cronMatcher.matches(expr, at({ year: 2026, month: 5, day: 21, hour: 4, minute: 0 })), false);
  });

  test('matches */10 and */15 minute schedules', () => {
    assert.equal(cronMatcher.matches('*/10 * * * *', at({ year: 2026, month: 5, day: 21, hour: 8, minute: 20 })), true);
    assert.equal(cronMatcher.matches('*/10 * * * *', at({ year: 2026, month: 5, day: 21, hour: 8, minute: 25 })), false);
    assert.equal(cronMatcher.matches('*/15 * * * *', at({ year: 2026, month: 5, day: 21, hour: 8, minute: 45 })), true);
  });

  test('rejects invalid expressions', () => {
    assert.equal(cronMatcher.isValidExpression('0 3 * *'), false);
    assert.equal(cronMatcher.matches('invalid cron', new Date()), false);
  });
});
