const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeIntlPhone,
  buildPhoneLookupCandidates,
} = require('../src/utils/phone');

describe('normalizeIntlPhone +60/+86', () => {
  test('MY local without leading zero', () => {
    assert.equal(normalizeIntlPhone('123456789', '+60'), '+60123456789');
  });

  test('MY with leading zero', () => {
    assert.equal(normalizeIntlPhone('0123456789', '+60'), '+60123456789');
  });

  test('MY pasted national form 601鈥?(fixes duplicate-country bug)', () => {
    assert.equal(normalizeIntlPhone('60123456789', '+60'), '+60123456789');
  });

  test('MY with spaces', () => {
    assert.equal(normalizeIntlPhone('12-345 6789', '+60'), '+60123456789');
  });

  test('CN 11-digit', () => {
    assert.equal(normalizeIntlPhone('13800138000', '+86'), '+8613800138000');
  });

  test('CN pasted 86138鈥?, () => {
    assert.equal(normalizeIntlPhone('8613800138000', '+86'), '+8613800138000');
  });
});

describe('buildPhoneLookupCandidates', () => {
  test('canonical +60 appears for different raw forms', () => {
    const c1 = new Set(buildPhoneLookupCandidates('60123456789', '+60'));
    const c2 = new Set(buildPhoneLookupCandidates('123456789', '+60'));
    assert.ok(c1.has('+60123456789'));
    assert.ok(c2.has('+60123456789'));
    const inter = [...c1].filter((x) => c2.has(x));
    assert.ok(inter.includes('+60123456789'));
  });
});

