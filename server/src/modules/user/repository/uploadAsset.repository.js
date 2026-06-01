const db = require('../../../config/db');

function parseMetadata(value) {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

async function insertUploadedAsset(asset) {
  await db.query(
    `INSERT INTO uploaded_assets
      (id, asset_group_id, uploader_id, uploader_type, upload_source, purpose,
       media_type, mime_type, original_mime_type, original_filename, filename,
       storage_provider, storage_key, source_storage_key, public_url, variant_tag,
       status, size_bytes, width, height, duration_seconds, checksum_sha256,
       metadata, processing_error)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      asset.id,
      asset.assetGroupId,
      asset.uploaderId || null,
      asset.uploaderType,
      asset.uploadSource,
      asset.purpose,
      asset.mediaType,
      asset.mimeType,
      asset.originalMimeType,
      asset.originalFilename,
      asset.filename,
      asset.storageProvider,
      asset.storageKey,
      asset.sourceStorageKey,
      asset.publicUrl,
      asset.variantTag,
      asset.status,
      asset.sizeBytes,
      asset.width,
      asset.height,
      asset.durationSeconds,
      asset.checksumSha256,
      asset.metadata ? JSON.stringify(asset.metadata) : null,
      asset.processingError,
    ],
  );
}

async function selectPendingVideoTranscodeAssets(limit = 3) {
  const [rows] = await db.query(
    `SELECT *
       FROM uploaded_assets
      WHERE media_type = 'video'
        AND deleted_at IS NULL
        AND status IN ('ready', 'queued', 'failed')
        AND JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.transcodeRequired')) = 'true'
        AND JSON_EXTRACT(metadata, '$.transcodedStorageKey') IS NULL
      ORDER BY created_at ASC
      LIMIT ?`,
    [Math.max(1, Math.min(10, Number(limit) || 3))],
  );
  return rows.map((row) => ({ ...row, metadata: parseMetadata(row.metadata) }));
}

async function claimVideoTranscodeAsset(id) {
  const [result] = await db.query(
    `UPDATE uploaded_assets
        SET status = 'processing',
            processing_error = '',
            metadata = JSON_SET(
              COALESCE(metadata, JSON_OBJECT()),
              '$.processing',
              'transcoding',
              '$.processingStartedAt',
              DATE_FORMAT(UTC_TIMESTAMP(3), '%Y-%m-%dT%H:%i:%s.%fZ')
            )
      WHERE id = ?
        AND media_type = 'video'
        AND deleted_at IS NULL
        AND status IN ('ready', 'queued', 'failed')
        AND JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.transcodeRequired')) = 'true'
        AND JSON_EXTRACT(metadata, '$.transcodedStorageKey') IS NULL`,
    [id],
  );
  return result.affectedRows === 1;
}

async function markVideoTranscodeReady(id, metadata) {
  await db.query(
    `UPDATE uploaded_assets
        SET status = 'ready',
            processing_error = '',
            metadata = ?
      WHERE id = ?`,
    [JSON.stringify(metadata || {}), id],
  );
}

async function markVideoTranscodeFailed(id, errorMessage, metadata = {}) {
  await db.query(
    `UPDATE uploaded_assets
        SET status = 'failed',
            processing_error = ?,
            metadata = ?
      WHERE id = ?`,
    [
      String(errorMessage || 'Video transcode failed').slice(0, 1000),
      JSON.stringify({
        ...metadata,
        processing: 'failed',
        transcodeRequired: true,
        failedAt: new Date().toISOString(),
      }),
      id,
    ],
  );
}

async function replaceProductVideoUrl(oldUrls, newUrl) {
  const candidates = Array.from(new Set((oldUrls || []).filter(Boolean)));
  if (!candidates.length || !newUrl) return 0;
  const placeholders = candidates.map(() => '?').join(',');
  const [result] = await db.query(
    `UPDATE products
        SET video_url = ?
      WHERE deleted_at IS NULL
        AND video_url IN (${placeholders})`,
    [newUrl, ...candidates],
  );
  return result.affectedRows || 0;
}

module.exports = {
  insertUploadedAsset,
  selectPendingVideoTranscodeAssets,
  claimVideoTranscodeAsset,
  markVideoTranscodeReady,
  markVideoTranscodeFailed,
  replaceProductVideoUrl,
};
