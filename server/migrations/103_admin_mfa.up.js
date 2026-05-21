module.exports = {
  async up(query) {
    await query(`
      CREATE TABLE IF NOT EXISTS admin_mfa_settings (
        user_id VARCHAR(36) NOT NULL PRIMARY KEY,
        totp_secret_enc TEXT NULL,
        enabled TINYINT(1) NOT NULL DEFAULT 0,
        enabled_at DATETIME NULL,
        last_verified_at DATETIME NULL,
        recovery_codes_hash JSON NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_admin_mfa_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS admin_trusted_devices (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        device_hash VARCHAR(128) NOT NULL,
        user_agent_hash VARCHAR(128) NOT NULL DEFAULT '',
        first_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        last_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME NOT NULL,
        revoked_at DATETIME NULL,
        UNIQUE KEY uk_admin_trusted_device (user_id, device_hash),
        KEY idx_admin_trusted_devices_user (user_id),
        KEY idx_admin_trusted_devices_expires (expires_at),
        CONSTRAINT fk_admin_trusted_device_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  },
};
