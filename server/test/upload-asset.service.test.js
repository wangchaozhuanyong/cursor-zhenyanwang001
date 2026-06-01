const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
  inferStorageProvider,
  normalizeAssetInput,
  normalizePurpose,
} = require('../src/modules/user/service/uploadAsset.service');

describe('upload asset metadata helpers', () => {
  test('normalizes image and video purposes', () => {
    assert.equal(normalizePurpose('image', 'image'), 'product');
    assert.equal(normalizePurpose('auto', 'video'), 'video');
    assert.equal(normalizePurpose('banner', 'image'), 'banner');
    assert.equal(normalizePurpose('unknown', 'image'), 'asset');
  });

  test('infers storage provider from public URL or key', () => {
    assert.equal(inferStorageProvider({ publicUrl: '/uploads/a.webp' }), 'local');
    assert.equal(inferStorageProvider({ storageKey: 'uploads/a.webp' }), 'local');
    assert.equal(inferStorageProvider({ publicUrl: 'data:image/webp;base64,abc' }), 'db-inline');
    assert.equal(inferStorageProvider({ publicUrl: 'https://d111.cloudfront.net/a.webp' }), 's3');
    assert.equal(inferStorageProvider({ publicUrl: 'https://cdn.example.com/a.webp' }), 'cdn');
  });

  test('normalizes asset record safely', () => {
    const asset = normalizeAssetInput({
      uploaderType: 'ADMIN',
      purpose: 'image',
      mediaType: 'image',
      mimeType: 'image/webp',
      originalFilename: 'source.png',
      filename: 'out.webp',
      publicUrl: '/uploads/out.webp',
      sizeBytes: 1024,
      buffer: Buffer.from('asset'),
    });

    assert.equal(asset.uploaderType, 'admin');
    assert.equal(asset.purpose, 'product');
    assert.equal(asset.storageProvider, 'local');
    assert.equal(asset.status, 'ready');
    assert.match(asset.checksumSha256, /^[a-f0-9]{64}$/);
  });
});
