module.exports = {
  async up(query) {
    const addColumn = async (sql) => {
      await query(sql).catch((e) => {
        if (e.code !== 'ER_DUP_FIELDNAME') throw e;
      });
    };

    const addIndex = async (sql) => {
      await query(sql).catch((e) => {
        if (e.code !== 'ER_DUP_KEYNAME' && e.errno !== 1061) throw e;
      });
    };

    await addColumn(`
      ALTER TABLE users
      ADD COLUMN protected_until DATETIME NULL DEFAULT NULL AFTER account_status
    `);

    await addColumn(`
      ALTER TABLE users
      ADD COLUMN protected_reason VARCHAR(255) NULL DEFAULT NULL AFTER protected_until
    `);

    await addIndex(`
      ALTER TABLE users
      ADD KEY idx_users_protected_until (protected_until)
    `);

    await addIndex(`
      ALTER TABLE user_login_audits
      ADD KEY idx_login_audit_ip_created (ip, created_at)
    `);

    await addIndex(`
      ALTER TABLE user_login_audits
      ADD KEY idx_login_audit_ua_created (ua_hash, created_at)
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS user_security_events (
        id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL PRIMARY KEY,
        user_id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
        event_type VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        severity VARCHAR(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'info',
        title VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        description VARCHAR(1000) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
        ip VARCHAR(45) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
        device_id VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
        user_agent VARCHAR(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
        metadata JSON NULL,
        resolved_at DATETIME NULL DEFAULT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY idx_user_security_events_user_created (user_id, created_at),
        KEY idx_user_security_events_ip_created (ip, created_at),
        KEY idx_user_security_events_device_created (device_id, created_at),
        KEY idx_user_security_events_type_created (event_type, created_at),
        KEY idx_user_security_events_severity_created (severity, created_at),
        CONSTRAINT fk_user_security_events_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS user_risk_ips (
        id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL PRIMARY KEY,
        ip VARCHAR(45) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        risk_level VARCHAR(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'medium',
        reason VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
        status VARCHAR(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'blocked',
        failed_count INT NOT NULL DEFAULT 0,
        related_user_count INT NOT NULL DEFAULT 0,
        last_seen_at DATETIME NULL DEFAULT NULL,
        blocked_at DATETIME NULL DEFAULT NULL,
        blocked_by VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
        unblocked_at DATETIME NULL DEFAULT NULL,
        unblocked_by VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_user_risk_ips_ip (ip),
        KEY idx_user_risk_ips_status (status),
        KEY idx_user_risk_ips_last_seen (last_seen_at),
        CONSTRAINT fk_user_risk_ips_blocked_by FOREIGN KEY (blocked_by) REFERENCES users (id) ON DELETE SET NULL,
        CONSTRAINT fk_user_risk_ips_unblocked_by FOREIGN KEY (unblocked_by) REFERENCES users (id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS user_risk_devices (
        id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL PRIMARY KEY,
        device_id VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        device_label VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
        risk_level VARCHAR(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'medium',
        reason VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
        status VARCHAR(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'blocked',
        related_user_count INT NOT NULL DEFAULT 0,
        last_seen_at DATETIME NULL DEFAULT NULL,
        blocked_at DATETIME NULL DEFAULT NULL,
        blocked_by VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
        unblocked_at DATETIME NULL DEFAULT NULL,
        unblocked_by VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_user_risk_devices_device (device_id),
        KEY idx_user_risk_devices_status (status),
        KEY idx_user_risk_devices_last_seen (last_seen_at),
        CONSTRAINT fk_user_risk_devices_blocked_by FOREIGN KEY (blocked_by) REFERENCES users (id) ON DELETE SET NULL,
        CONSTRAINT fk_user_risk_devices_unblocked_by FOREIGN KEY (unblocked_by) REFERENCES users (id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  },
};
