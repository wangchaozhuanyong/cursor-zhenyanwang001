const test = require('node:test');
const assert = require('node:assert/strict');
const { klDateString } = require('../src/utils/klDateRange');

test('klDateString uses KL calendar day not UTC date near midnight', () => {
  const utcLateEvening = new Date('2024-06-01T16:30:00.000Z');
  assert.equal(utcLateEvening.toISOString().slice(0, 10), '2024-06-01');
  assert.equal(klDateString(utcLateEvening), '2024-06-02');
});

test('klDateString matches UTC date during KL midday', () => {
  const utcMorning = new Date('2024-06-01T04:00:00.000Z');
  assert.equal(klDateString(utcMorning), '2024-06-01');
});
