const test = require('node:test');
const assert = require('node:assert/strict');

const { buildTranscodedKeys } = require('../src/modules/media/service/videoTranscode.service');

test('buildTranscodedKeys keeps the uploaded video base name', () => {
  const keys = buildTranscodedKeys({
    filename: 'abc123.mov',
    storage_key: 'prod/uploads/videos/abc123.mov',
  });
  assert.equal(keys.mp4Key, 'uploads/videos/transcoded/abc123.mp4');
  assert.equal(keys.posterKey, 'uploads/videos/posters/abc123.webp');
  assert.equal(keys.mp4Filename, 'abc123.mp4');
  assert.equal(keys.posterFilename, 'abc123.webp');
});

test('buildTranscodedKeys falls back to storage key base name', () => {
  const keys = buildTranscodedKeys({
    storage_key: 'prod/uploads/videos/original-file.webm',
  });
  assert.equal(keys.mp4Key, 'uploads/videos/transcoded/original-file.mp4');
  assert.equal(keys.posterKey, 'uploads/videos/posters/original-file.webp');
});
