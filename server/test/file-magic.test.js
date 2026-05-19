const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { bufferMatchesDeclaredMime } = require('../src/utils/fileMagic');

describe('fileMagic', () => {
  test('accepts JPEG magic bytes', () => {
    const buf = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    assert.equal(bufferMatchesDeclaredMime(buf, 'image/jpeg'), true);
  });

  test('accepts PNG magic bytes', () => {
    const buf = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
    assert.equal(bufferMatchesDeclaredMime(buf, 'image/png'), true);
  });

  test('rejects MIME/extension spoof (PNG header as JPEG)', () => {
    const buf = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    assert.equal(bufferMatchesDeclaredMime(buf, 'image/jpeg'), false);
  });

  test('rejects empty buffer', () => {
    assert.equal(bufferMatchesDeclaredMime(Buffer.alloc(0), 'image/png'), false);
  });
});

