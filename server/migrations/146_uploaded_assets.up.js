module.exports = {
  async up(query) {
    await query(`
      CREATE TABLE IF NOT EXISTS uploaded_assets (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        asset_group_id VARCHAR(36) NOT NULL,
        uploader_id VARCHAR(36) NULL,
        uploader_type VARCHAR(32) NOT NULL DEFAULT 'user',
        upload_source VARCHAR(64) NOT NULL DEFAULT 'multipart',
        purpose VARCHAR(32) NOT NULL DEFAULT 'asset',
        media_type VARCHAR(16) NOT NULL DEFAULT 'image',
        mime_type VARCHAR(100) NOT NULL DEFAULT '',
        original_mime_type VARCHAR(100) NOT NULL DEFAULT '',
        original_filename VARCHAR(255) NOT NULL DEFAULT '',
        filename VARCHAR(255) NOT NULL DEFAULT '',
        storage_provider VARCHAR(32) NOT NULL DEFAULT 'local',
        storage_key VARCHAR(1024) NOT NULL DEFAULT '',
        source_storage_key VARCHAR(1024) NOT NULL DEFAULT '',
        public_url VARCHAR(2000) NOT NULL DEFAULT '',
        variant_tag VARCHAR(32) NOT NULL DEFAULT 'full',
        status VARCHAR(32) NOT NULL DEFAULT 'ready',
        size_bytes BIGINT UNSIGNED NOT NULL DEFAULT 0,
        width INT UNSIGNED NULL,
        height INT UNSIGNED NULL,
        duration_seconds DECIMAL(10,3) NULL,
        checksum_sha256 CHAR(64) NOT NULL DEFAULT '',
        metadata JSON NULL,
        processing_error VARCHAR(1000) NOT NULL DEFAULT '',
        deleted_at DATETIME NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY idx_uploaded_assets_group (asset_group_id),
        KEY idx_uploaded_assets_uploader (uploader_type, uploader_id, created_at),
        KEY idx_uploaded_assets_purpose (purpose, media_type, status, created_at),
        KEY idx_uploaded_assets_storage_key (storage_provider, storage_key(191)),
        KEY idx_uploaded_assets_public_url (public_url(191)),
        KEY idx_uploaded_assets_deleted (deleted_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  },
};
