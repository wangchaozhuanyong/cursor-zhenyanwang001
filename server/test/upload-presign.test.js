const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
  buildRawUploadKey,
  buildStorageKey,
  assertRawObjectKeyOwnedByUser,
} = require('../src/utils/objectStorage');

describe('upload presign key ownership', () => {
  test('buildRawUploadKey scopes to user', () => {
    const key = buildRawUploadKey('user-1', 'image/png');
    assert.match(key, /^uploads\/raw\/user-1\/[a-f0-9]{32}\.png$/);
  });

  test('assertRawObjectKeyOwnedByUser accepts matching prefix', () => {
    const storageKey = buildStorageKey(buildRawUploadKey('u42', 'image/jpeg'));
    assert.doesNotThrow(() => assertRawObjectKeyOwnedByUser(storageKey, 'u42'));
  });

  test('assertRawObjectKeyOwnedByUser rejects other user', () => {
    const storageKey = buildStorageKey(buildRawUploadKey('u42', 'image/jpeg'));
    assert.throws(
      () => assertRawObjectKeyOwnedByUser(storageKey, 'other'),
      /无权访问/,
    );
  });
});
