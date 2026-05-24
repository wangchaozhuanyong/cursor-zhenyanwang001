const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { csvEscape, rowsToCsv } = require('../src/utils/csv');

describe('csv formula injection protection', () => {
  test('prefixes dangerous spreadsheet formula characters', () => {
    assert.equal(csvEscape('=1+1'), "'=1+1");
    assert.equal(csvEscape('+1234'), "'+1234");
    assert.equal(csvEscape('-100'), "'-100");
    assert.equal(csvEscape('@SUM(A1)'), "'@SUM(A1)");
  });

  test('still escapes commas and quotes', () => {
    assert.equal(csvEscape('hello, world'), '"hello, world"');
    assert.equal(csvEscape('say "hi"'), '"say ""hi"""');
  });

  test('rowsToCsv neutralizes formula cells', () => {
    const csv = rowsToCsv(['name'], [{ name: '=cmd|"/c calc"!A0' }]);
    assert.match(csv, /'=cmd/);
  });
});
