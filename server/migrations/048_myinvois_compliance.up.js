/**
 * Malaysia LHDN MyInvois optional compliance integration.
 *
 * The integration is intentionally inert until MYINVOIS_ENABLED=1 and an
 * enabled profile is configured. Secrets are stored as references, not raw
 * credential material.
 */
module.exports = {
  async up(query) {
    await query(`
      CREATE TABLE IF NOT EXISTS myinvois_profiles (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        enabled TINYINT(1) NOT NULL DEFAULT 0,
        environment VARCHAR(16) NOT NULL DEFAULT 'sandbox',
        supplier_tin VARCHAR(64) NOT NULL DEFAULT '',
        supplier_name VARCHAR(191) NOT NULL DEFAULT '',
        supplier_id_type VARCHAR(32) NOT NULL DEFAULT '',
        supplier_id_value VARCHAR(64) NOT NULL DEFAULT '',
        supplier_sst VARCHAR(64) NOT NULL DEFAULT '',
        supplier_email VARCHAR(191) NOT NULL DEFAULT '',
        supplier_phone VARCHAR(64) NOT NULL DEFAULT '',
        supplier_address_json JSON NULL,
        client_id VARCHAR(191) NOT NULL DEFAULT '',
        client_secret_ref VARCHAR(191) NOT NULL DEFAULT '',
        certificate_ref VARCHAR(191) NOT NULL DEFAULT '',
        certificate_fingerprint VARCHAR(191) NOT NULL DEFAULT '',
        certificate_expires_at DATETIME NULL,
        signing_key_ref VARCHAR(191) NOT NULL DEFAULT '',
        config_json JSON NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY idx_myinvois_profiles_enabled (enabled, environment)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS myinvois_documents (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        profile_id VARCHAR(36) NULL,
        document_type VARCHAR(32) NOT NULL,
        source_type VARCHAR(32) NOT NULL,
        source_id VARCHAR(36) NOT NULL,
        order_id VARCHAR(36) NOT NULL,
        order_no VARCHAR(64) NOT NULL DEFAULT '',
        user_id VARCHAR(36) NULL,
        currency VARCHAR(8) NOT NULL DEFAULT 'MYR',
        amount DECIMAL(14,2) NOT NULL DEFAULT 0,
        status VARCHAR(32) NOT NULL DEFAULT 'queued',
        retry_count INT NOT NULL DEFAULT 0,
        next_attempt_at DATETIME NULL,
        lhdn_submission_uid VARCHAR(128) NOT NULL DEFAULT '',
        lhdn_uuid VARCHAR(128) NOT NULL DEFAULT '',
        validation_link VARCHAR(512) NOT NULL DEFAULT '',
        payload_json JSON NULL,
        response_json JSON NULL,
        last_error VARCHAR(1024) NOT NULL DEFAULT '',
        submitted_at DATETIME NULL,
        accepted_at DATETIME NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_myinvois_source (document_type, source_type, source_id),
        KEY idx_myinvois_documents_status (status, next_attempt_at),
        KEY idx_myinvois_documents_order (order_id),
        KEY idx_myinvois_documents_profile (profile_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS myinvois_events (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        document_id VARCHAR(36) NULL,
        event_type VARCHAR(64) NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT '',
        payload_json JSON NULL,
        error_message VARCHAR(1024) NOT NULL DEFAULT '',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY idx_myinvois_events_document (document_id),
        KEY idx_myinvois_events_type (event_type)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS myinvois_reconciliations (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        reconcile_date DATE NOT NULL,
        document_type VARCHAR(32) NOT NULL DEFAULT '',
        queued_count INT NOT NULL DEFAULT 0,
        submitted_count INT NOT NULL DEFAULT 0,
        accepted_count INT NOT NULL DEFAULT 0,
        failed_count INT NOT NULL DEFAULT 0,
        total_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
        notes VARCHAR(512) NOT NULL DEFAULT '',
        created_by VARCHAR(36) NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY idx_myinvois_recon_date (reconcile_date, document_type)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await query(`
      INSERT IGNORE INTO permissions (code, name, sort_order)
      VALUES ('myinvois.manage', 'MyInvois 合规管理', 103)
    `);
    for (const roleCode of ['super_admin', 'admin_manager']) {
      await query(
        `INSERT IGNORE INTO role_permissions (role_id, permission_id)
         SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
         WHERE r.code = ? AND p.code = 'myinvois.manage'`,
        [roleCode],
      );
    }
  },
};
