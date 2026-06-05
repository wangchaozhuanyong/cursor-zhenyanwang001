const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const sharp = require('sharp');
const {
  buildNavIconThumbCacheKey,
  extractStorageKeyFromSource,
  getOrCreateNavIconThumb,
  isNavIconThumbSourceAllowed,
  isUploadImagePathname,
} = require('../src/modules/media/service/navIconThumb.service');

describe('nav icon thumb service', () => {
  test('allows only upload image sources from trusted locations', () => {
    assert.equal(isNavIconThumbSourceAllowed('/uploads/a.webp'), true);
    assert.equal(isNavIconThumbSourceAllowed('/uploads/a.svg'), false);
    assert.equal(isNavIconThumbSourceAllowed('/assets/a.webp'), false);
    assert.equal(isNavIconThumbSourceAllowed('data:image/webp;base64,abc'), false);
    assert.equal(isNavIconThumbSourceAllowed('https://cdn.damatong.net/prod/uploads/a.webp'), true);
    assert.equal(isNavIconThumbSourceAllowed('https://evil.example.com/uploads/a.webp'), false);
    assert.equal(isUploadImagePathname('/prod/uploads/a.webp'), true);
    assert.equal(isUploadImagePathname('/prod/uploads/../secret.webp'), false);
  });

  test('builds stable cache keys from source and options', () => {
    const first = buildNavIconThumbCacheKey('/uploads/a.webp', { width: 128, quality: 80 });
    const second = buildNavIconThumbCacheKey('/uploads/a.webp', { width: 128, quality: 80 });
    const third = buildNavIconThumbCacheKey('/uploads/a.webp', { width: 96, quality: 80 });
    assert.equal(first, second);
    assert.notEqual(first, third);
  });

  test('extracts object storage keys without downloading through CDN', () => {
    const oldPublicBaseUrl = process.env.STORAGE_PUBLIC_BASE_URL;
    const oldKeyPrefix = process.env.STORAGE_KEY_PREFIX;
    process.env.STORAGE_PUBLIC_BASE_URL = 'https://cdn.damatong.net';
    process.env.STORAGE_KEY_PREFIX = 'damatong/prod';

    try {
      assert.equal(
        extractStorageKeyFromSource('https://cdn.damatong.net/damatong/prod/uploads/a.webp?x=1'),
        'damatong/prod/uploads/a.webp',
      );
      assert.equal(extractStorageKeyFromSource('/uploads/a.webp'), 'damatong/prod/uploads/a.webp');
    } finally {
      if (oldPublicBaseUrl === undefined) delete process.env.STORAGE_PUBLIC_BASE_URL;
      else process.env.STORAGE_PUBLIC_BASE_URL = oldPublicBaseUrl;
      if (oldKeyPrefix === undefined) delete process.env.STORAGE_KEY_PREFIX;
      else process.env.STORAGE_KEY_PREFIX = oldKeyPrefix;
    }
  });

  test('renders and reuses cached thumbnails', async () => {
    const sourceDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'nav-icon-src-'));
    const cacheDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'nav-icon-cache-'));
    const sourcePath = path.join(sourceDir, 'icon.webp');
    const sourceBuffer = await sharp({
      create: {
        width: 800,
        height: 800,
        channels: 4,
        background: { r: 255, g: 80, b: 0, alpha: 1 },
      },
    }).webp({ quality: 90 }).toBuffer();
    await fs.promises.writeFile(sourcePath, sourceBuffer);

    const first = await getOrCreateNavIconThumb(`file://${sourcePath}`, {
      cacheDir,
      requestHost: 'localhost',
    }).catch((error) => error);
    assert.equal(first instanceof Error, true);

    const localUploadRoot = path.join(__dirname, '..', 'public', 'uploads');
    const localUploadPath = path.join(localUploadRoot, `test-${Date.now()}.webp`);
    await fs.promises.mkdir(localUploadRoot, { recursive: true });
    await fs.promises.writeFile(localUploadPath, sourceBuffer);

    try {
      const source = `/uploads/${path.basename(localUploadPath)}`;
      const rendered = await getOrCreateNavIconThumb(source, { cacheDir });
      const renderedBuffer = await fs.promises.readFile(rendered.filePath);
      const metadata = await sharp(renderedBuffer).metadata();
      assert.equal(rendered.cacheHit, false);
      assert.equal(Math.max(metadata.width || 0, metadata.height || 0) <= 128, true);

      const cached = await getOrCreateNavIconThumb(source, { cacheDir });
      assert.equal(cached.cacheHit, true);
      assert.equal(cached.filePath, rendered.filePath);
    } finally {
      await fs.promises.rm(localUploadPath, { force: true });
      await fs.promises.rm(sourceDir, { recursive: true, force: true });
      await fs.promises.rm(cacheDir, { recursive: true, force: true });
    }
  });
});
