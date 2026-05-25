module.exports = {
  async up(query) {
    await query(`
      ALTER TABLE admin_trusted_devices
        ADD COLUMN device_label VARCHAR(120) NOT NULL DEFAULT '' AFTER user_agent_hash
    `).catch((err) => {
      if (!/Duplicate column name/i.test(String(err && err.message))) throw err;
    });

    await query(`
      ALTER TABLE admin_trusted_devices
        ADD COLUMN trusted_ip_hash VARCHAR(128) NOT NULL DEFAULT '' AFTER device_label
    `).catch((err) => {
      if (!/Duplicate column name/i.test(String(err && err.message))) throw err;
    });

    await query(`
      ALTER TABLE admin_trusted_devices
        ADD COLUMN last_ip_hash VARCHAR(128) NOT NULL DEFAULT '' AFTER trusted_ip_hash
    `).catch((err) => {
      if (!/Duplicate column name/i.test(String(err && err.message))) throw err;
    });

    await query(`
      CREATE TABLE IF NOT EXISTS admin_sensitive_action_tokens (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        admin_session_id VARCHAR(80) NOT NULL,
        device_hash VARCHAR(128) NOT NULL DEFAULT '',
        action_class VARCHAR(80) NOT NULL,
        token_hash VARCHAR(128) NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME NOT NULL,
        last_used_at DATETIME NULL,
        used_count INT NOT NULL DEFAULT 0,
        revoked_at DATETIME NULL,
        UNIQUE KEY uk_admin_sensitive_action_token (token_hash),
        KEY idx_admin_sensitive_action_lookup (user_id, admin_session_id, action_class, expires_at),
        KEY idx_admin_sensitive_action_expires (expires_at),
        CONSTRAINT fk_admin_sensitive_action_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS admin_webauthn_credentials (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        credential_id_hash VARCHAR(128) NOT NULL,
        credential_id_enc TEXT NULL,
        public_key TEXT NOT NULL,
        counter BIGINT NOT NULL DEFAULT 0,
        transports JSON NULL,
        aaguid VARCHAR(80) NOT NULL DEFAULT '',
        device_label VARCHAR(120) NOT NULL DEFAULT '',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        last_used_at DATETIME NULL,
        revoked_at DATETIME NULL,
        UNIQUE KEY uk_admin_webauthn_credential (credential_id_hash),
        KEY idx_admin_webauthn_user (user_id),
        CONSTRAINT fk_admin_webauthn_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  },
};
