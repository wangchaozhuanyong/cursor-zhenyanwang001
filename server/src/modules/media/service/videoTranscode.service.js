const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');
const sharp = require('sharp');
const {
  getS3ObjectBuffer,
  uploadBufferToS3,
  deleteS3Object,
  getPublicUrlByKey,
  isS3StorageEnabled,
} = require('../../../utils/objectStorage');
const userModule = require('../../user');

const userApi = userModule.api;

const DEFAULT_MAX_WIDTH = 1280;
const DEFAULT_CRF = 26;

function ffmpegBin() {
  return process.env.FFMPEG_BIN || 'ffmpeg';
}

function ffprobeBin() {
  return process.env.FFPROBE_BIN || 'ffprobe';
}

function runProcess(command, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'ignore', 'pipe'], ...opts });
    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
      if (stderr.length > 6000) stderr = stderr.slice(-6000);
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stderr });
        return;
      }
      reject(new Error(`${command} exited with code ${code}: ${stderr.slice(-1000)}`));
    });
  });
}

async function probeVideo(filePath) {
  return new Promise((resolve) => {
    const child = spawn(ffprobeBin(), [
      '-v', 'error',
      '-print_format', 'json',
      '-show_entries', 'format=duration',
      '-show_entries', 'stream=width,height',
      '-select_streams', 'v:0',
      filePath,
    ], { stdio: ['ignore', 'pipe', 'ignore'] });
    let stdout = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.on('close', () => {
      try {
        const parsed = JSON.parse(stdout || '{}');
        const stream = Array.isArray(parsed.streams) ? parsed.streams[0] || {} : {};
        resolve({
          width: Number(stream.width || 0) || null,
          height: Number(stream.height || 0) || null,
          durationSeconds: Number(parsed.format?.duration || 0) || null,
        });
      } catch {
        resolve({ width: null, height: null, durationSeconds: null });
      }
    });
    child.on('error', () => resolve({ width: null, height: null, durationSeconds: null }));
  });
}

function baseNameFromAsset(asset) {
  const raw = path.basename(asset.filename || asset.storage_key || crypto.randomUUID());
  return raw.replace(/\.[^.]+$/, '') || crypto.randomUUID();
}

function buildTranscodedKeys(asset) {
  const base = baseNameFromAsset(asset);
  return {
    mp4Key: `uploads/videos/transcoded/${base}.mp4`,
    posterKey: `uploads/videos/posters/${base}.webp`,
    mp4Filename: `${base}.mp4`,
    posterFilename: `${base}.webp`,
  };
}

async function safeUnlink(filePath) {
  try {
    await fs.promises.unlink(filePath);
  } catch {}
}

async function processVideoAsset(asset) {
  if (!isS3StorageEnabled()) {
    throw new Error('Video transcode worker requires S3 storage');
  }
  if (!asset.storage_key) {
    throw new Error('Video asset storage_key is empty');
  }

  const claimed = await userApi.claimVideoTranscodeAsset(asset.id);
  if (!claimed) return { skipped: true, reason: 'already claimed' };

  const metadata = asset.metadata && typeof asset.metadata === 'object' ? asset.metadata : {};
  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'media-transcode-'));
  const inputPath = path.join(tmpDir, 'source');
  const outputPath = path.join(tmpDir, 'web.mp4');
  const posterPngPath = path.join(tmpDir, 'poster.png');

  let mp4StorageKey = '';
  let posterStorageKey = '';
  try {
    const originalBuffer = await getS3ObjectBuffer(asset.storage_key);
    await fs.promises.writeFile(inputPath, originalBuffer);
    const before = await probeVideo(inputPath);
    const maxWidth = Math.max(320, Number(process.env.VIDEO_TRANSCODE_MAX_WIDTH || DEFAULT_MAX_WIDTH));
    const crf = Math.max(20, Math.min(34, Number(process.env.VIDEO_TRANSCODE_CRF || DEFAULT_CRF)));
    const scaleFilter = `scale='min(${maxWidth},iw)':-2`;

    await runProcess(ffmpegBin(), [
      '-y',
      '-i', inputPath,
      '-map', '0:v:0',
      '-map', '0:a?',
      '-vf', scaleFilter,
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-crf', String(crf),
      '-c:a', 'aac',
      '-b:a', '128k',
      '-movflags', '+faststart',
      outputPath,
    ]);

    const seekAt = before.durationSeconds && before.durationSeconds > 2 ? '1' : '0';
    await runProcess(ffmpegBin(), [
      '-y',
      '-ss', seekAt,
      '-i', inputPath,
      '-frames:v', '1',
      '-vf', scaleFilter,
      posterPngPath,
    ]);

    const posterBuffer = await sharp(posterPngPath).webp({ quality: 82 }).toBuffer();
    const mp4Buffer = await fs.promises.readFile(outputPath);
    const after = await probeVideo(outputPath);
    const keys = buildTranscodedKeys(asset);

    const mp4Uploaded = await uploadBufferToS3({
      key: keys.mp4Key,
      body: mp4Buffer,
      contentType: 'video/mp4',
      cacheControl: 'public, max-age=31536000, immutable',
    });
    mp4StorageKey = mp4Uploaded.key;

    const posterUploaded = await uploadBufferToS3({
      key: keys.posterKey,
      body: posterBuffer,
      contentType: 'image/webp',
      cacheControl: 'public, max-age=31536000, immutable',
    });
    posterStorageKey = posterUploaded.key;

    await userApi.recordUploadedAsset({
      assetGroupId: asset.asset_group_id,
      uploaderId: asset.uploader_id,
      uploaderType: asset.uploader_type,
      uploadSource: 'video_transcode_worker',
      purpose: 'video',
      mediaType: 'video',
      mimeType: 'video/mp4',
      originalMimeType: asset.original_mime_type || asset.mime_type,
      originalFilename: asset.original_filename,
      filename: keys.mp4Filename,
      storageProvider: 's3',
      storageKey: mp4Uploaded.key,
      sourceStorageKey: asset.storage_key,
      publicUrl: mp4Uploaded.url,
      variantTag: 'web_mp4',
      status: 'ready',
      sizeBytes: mp4Buffer.length,
      width: after.width,
      height: after.height,
      durationSeconds: after.durationSeconds,
      buffer: mp4Buffer,
      metadata: {
        sourceAssetId: asset.id,
        originalSizeBytes: Number(asset.size_bytes || originalBuffer.length),
        crf,
        maxWidth,
      },
    });

    await userApi.recordUploadedAsset({
      assetGroupId: asset.asset_group_id,
      uploaderId: asset.uploader_id,
      uploaderType: asset.uploader_type,
      uploadSource: 'video_transcode_worker',
      purpose: 'video',
      mediaType: 'image',
      mimeType: 'image/webp',
      originalMimeType: asset.original_mime_type || asset.mime_type,
      originalFilename: asset.original_filename,
      filename: keys.posterFilename,
      storageProvider: 's3',
      storageKey: posterUploaded.key,
      sourceStorageKey: asset.storage_key,
      publicUrl: posterUploaded.url,
      variantTag: 'poster',
      status: 'ready',
      sizeBytes: posterBuffer.length,
      buffer: posterBuffer,
      metadata: {
        sourceAssetId: asset.id,
        role: 'video_poster',
      },
    });

    const nextMetadata = {
      ...metadata,
      processing: 'transcoded',
      transcodeRequired: false,
      transcodedStorageKey: mp4Uploaded.key,
      transcodedPublicUrl: mp4Uploaded.url,
      posterStorageKey: posterUploaded.key,
      posterPublicUrl: posterUploaded.url,
      originalSizeBytes: Number(asset.size_bytes || originalBuffer.length),
      transcodedSizeBytes: mp4Buffer.length,
      width: after.width,
      height: after.height,
      durationSeconds: after.durationSeconds,
      completedAt: new Date().toISOString(),
    };
    await userApi.markVideoTranscodeReady(asset.id, nextMetadata);

    const replacementCandidates = [
      asset.public_url,
      getPublicUrlByKey(asset.storage_key),
      metadata.publicUrl,
    ];
    const replacedProducts = await userApi.replaceProductVideoUrl(replacementCandidates, mp4Uploaded.url);
    return {
      assetId: asset.id,
      mp4Url: mp4Uploaded.url,
      posterUrl: posterUploaded.url,
      replacedProducts,
      originalBytes: Number(asset.size_bytes || originalBuffer.length),
      transcodedBytes: mp4Buffer.length,
    };
  } catch (error) {
    if (mp4StorageKey) await deleteS3Object(mp4StorageKey).catch(() => {});
    if (posterStorageKey) await deleteS3Object(posterStorageKey).catch(() => {});
    await userApi.markVideoTranscodeFailed(asset.id, error?.message || String(error), metadata);
    throw error;
  } finally {
    await safeUnlink(inputPath);
    await safeUnlink(outputPath);
    await safeUnlink(posterPngPath);
    try {
      await fs.promises.rmdir(tmpDir);
    } catch {}
  }
}

module.exports = {
  buildTranscodedKeys,
  processVideoAsset,
  probeVideo,
};
