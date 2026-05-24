const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const {
  inferCountryCodeForPhone,
  normalizeIntlPhone,
  buildPhoneLookupCandidates,
} = require('../src/utils/phone');

describe('inferCountryCodeForPhone', () => {
  test('china 11-digit mobile', () => {
    assert.equal(inferCountryCodeForPhone('15399999630'), '86');
    assert.equal(normalizeIntlPhone('15399999630', '86'), '+8615399999630');
  });

  test('lookup candidates include canonical and raw', () => {
    const candidates = buildPhoneLookupCandidates('15399999630', '86');
    assert.ok(candidates.includes('+8615399999630'));
    assert.ok(candidates.includes('15399999630'));
  });
});
