const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
  extractSourceStorageKey,
  inferImageMimeType,
  isBackfillableIconUrl,
  shouldOptimizeIconImage,
  summarizeBytes,
} = require('../src/maintenance/homeNavIconBackfill');

describe('home nav icon backfill helpers', () => {
  test('detects upload image URLs and skips tokens/data', () => {
    assert.equal(isBackfillableIconUrl('/uploads/a.webp'), true);
    assert.equal(isBackfillableIconUrl('https://cdn.example.com/app/uploads/a.png'), true);
    assert.equal(isBackfillableIconUrl('https://example.com/icon.webp'), false);
    assert.equal(isBackfillableIconUrl('https://example.com/icon.webp', { includeExternal: true }), true);
    assert.equal(isBackfillableIconUrl('grid'), false);
    assert.equal(isBackfillableIconUrl('data:image/webp;base64,abc'), false);
  });

  test('extracts source storage key from local or CDN upload URLs', () => {
    assert.equal(extractSourceStorageKey('/uploads/a.webp'), 'uploads/a.webp');
    assert.equal(
      extractSourceStorageKey('https://cdn.damatong.net/damatong/prod/uploads/a.webp?x=1'),
      'uploads/a.webp',
    );
    assert.equal(extractSourceStorageKey('https://cdn.example.com/assets/a.webp'), undefined);
  });

  test('infers mime type and optimization need', () => {
    assert.equal(inferImageMimeType('/uploads/a.png'), 'image/png');
    assert.equal(inferImageMimeType('/uploads/a.webp', 'image/jpeg; charset=binary'), 'image/jpeg');
    assert.equal(shouldOptimizeIconImage({ width: 800, height: 800 }, { maxEdge: 256 }), true);
    assert.equal(shouldOptimizeIconImage({ width: 128, height: 128 }, { maxEdge: 256 }), false);
  });

  test('formats byte summaries', () => {
    assert.equal(summarizeBytes(0), '0B');
    assert.equal(summarizeBytes(1536), '1.5KB');
  });
});
