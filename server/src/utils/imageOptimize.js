const crypto = require('crypto');
const sharp = require('sharp');

/** @typedef {'product' | 'banner' | 'thumb' | 'asset'} ImageUploadMode */

/**
 * 上传图片仅在此模块做一次性处理（禁止前端 Canvas 再压一遍）。
 * product：生成 card / detail / full 三档 WebP，数据库存 full 的 URL。
 */
const PRESETS = {
  product: {
    kind: 'variants',
    outputs: [
      { tag: 'card', suffix: '-card', width: 480, quality: 82 },
      { tag: 'detail', suffix: '-detail', width: 1280, quality: 86 },
      { tag: 'full', suffix: '', width: 2048, quality: 88 },
    ],
    primaryTag: 'full',
  },
  banner: { kind: 'single', width: 2560, quality: 92 },
  thumb: { kind: 'single', width: 800, quality: 85 },
  asset: { kind: 'single', width: 1920, quality: 88 },
};

function normalizeImageMode(mode) {
  const raw = String(mode || 'product').toLowerCase();
  if (raw === 'image') return 'product';
  if (PRESETS[raw]) return raw;
  return 'product';
}

function buildFilename(baseId, suffix) {
  return `${baseId}${suffix || ''}.webp`;
}

/**
 * @param {Buffer} inputBuffer
 * @param {{ width: number, quality: number }} spec
 * @param {{ oriented?: boolean }} opts oriented=true 表示 buffer 已 rotate 过
 */
async function renderWebp(inputBuffer, spec, opts = {}) {
  let pipeline = sharp(inputBuffer);
  if (!opts.oriented) pipeline = pipeline.rotate();
  return pipeline
    .resize({
      width: spec.width,
      height: spec.width,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: spec.quality, effort: 4 })
    .toBuffer();
}

/**
 * 已是 WebP 且最长边不超过目标、体积合理时，单档模式可跳过再编码（避免二次损耗）。
 */
async function canPassthroughSingle(file, spec) {
  if (file.mimetype !== 'image/webp') return false;
  try {
    const meta = await sharp(file.buffer).metadata();
    const maxEdge = Math.max(meta.width || 0, meta.height || 0);
    if (!maxEdge || maxEdge > spec.width) return false;
    const maxBytes = Math.max(180 * 1024, spec.width * spec.width * 0.12);
    return file.size <= maxBytes;
  } catch {
    return false;
  }
}

/**
 * @param {Express.Multer.File} file
 * @param {string} mode
 * @returns {Promise<{ files: Array<{ filename: string, buffer: Buffer, tag?: string }>, primaryTag: string }>}
 */
async function optimizeImageFile(file, mode) {
  const presetKey = normalizeImageMode(mode);
  const preset = PRESETS[presetKey];
  const baseId = crypto.randomBytes(16).toString('hex');

  if (preset.kind === 'single') {
    const spec = { width: preset.width, quality: preset.quality };
    if (await canPassthroughSingle(file, spec)) {
      const filename = buildFilename(baseId, '');
      return {
        files: [{ filename, buffer: file.buffer, tag: 'full' }],
        primaryTag: 'full',
      };
    }
    const buffer = await renderWebp(file.buffer, spec);
    const filename = buildFilename(baseId, '');
    return {
      files: [{ filename, buffer, tag: 'full' }],
      primaryTag: 'full',
    };
  }

  const oriented = await sharp(file.buffer).rotate().toBuffer();
  const files = await Promise.all(
    preset.outputs.map(async (out) => {
      const buffer = await renderWebp(oriented, out, { oriented: true });
      return {
        filename: buildFilename(baseId, out.suffix),
        buffer,
        tag: out.tag,
      };
    }),
  );

  return { files, primaryTag: preset.primaryTag };
}

module.exports = {
  PRESETS,
  normalizeImageMode,
  optimizeImageFile,
  buildFilename,
};
