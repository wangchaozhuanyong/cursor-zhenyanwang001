const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeSettings } = require('../src/modules/loyalty/service/pointsEngine.service');

test('normalizeSettings exposes allow_negative_points flag', () => {
  assert.equal(normalizeSettings({}).allow_negative_points, 0);
  assert.equal(normalizeSettings({ allow_negative_points: 1 }).allow_negative_points, 1);
  assert.equal(normalizeSettings({ allow_negative_points: true }).allow_negative_points, 1);
});
