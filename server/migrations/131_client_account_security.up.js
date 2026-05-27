module.exports = {
  async up(query) {
    await query(`
      ALTER TABLE users
      ADD COLUMN protected_until DATETIME NULL DEFAULT NULL AFTER account_status,
      ADD COLUMN protected_reason VARCHAR(64) NULL DEFAULT NULL AFTER protected_until
    `).catch((e) => {
      if (e.code !== 'ER_DUP_FIELDNAME') throw e;
    });

    await query(`
      ALTER TABLE users
      ADD KEY idx_users_protected_until (protected_until)
    `).catch((e) => {
      if (e.code !== 'ER_DUP_KEYNAME') throw e;
    });

    await query(`
      CREATE TABLE IF NOT EXISTS user_devices (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        device_id VARCHAR(128) NOT NULL,
        device_name VARCHAR(191) NULL DEFAULT NULL,
        first_ip VARCHAR(45) NULL DEFAULT NULL,
        last_ip VARCHAR(45) NULL DEFAULT NULL,
        user_agent VARCHAR(500) NULL DEFAULT NULL,
        fingerprint_hash CHAR(64) NULL DEFAULT NULL,
        trusted TINYINT(1) NOT NULL DEFAULT 0,
        first_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        last_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        revoked_at DATETIME NULL DEFAULT NULL,
        UNIQUE KEY uk_user_devices_user_device (user_id, device_id),
        KEY idx_user_devices_user_last_seen (user_id, last_seen_at),
        KEY idx_user_devices_device (device_id),
        CONSTRAINT fk_user_devices_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        device_id VARCHAR(128) NOT NULL,
        refresh_token_hash CHAR(64) NOT NULL,
        ip VARCHAR(45) NULL DEFAULT NULL,
        user_agent VARCHAR(500) NULL DEFAULT NULL,
        last_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME NOT NULL,
        revoked_at DATETIME NULL DEFAULT NULL,
        revoke_reason VARCHAR(64) NULL DEFAULT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_user_sessions_refresh_hash (refresh_token_hash),
        KEY idx_user_sessions_user_active (user_id, revoked_at, expires_at),
        KEY idx_user_sessions_device (device_id),
        CONSTRAINT fk_user_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS user_login_attempts (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        user_id VARCHAR(36) NULL DEFAULT NULL,
        login_identifier VARCHAR(191) NOT NULL,
        success TINYINT(1) NOT NULL DEFAULT 0,
        failure_reason VARCHAR(64) NULL DEFAULT NULL,
        risk_score INT NOT NULL DEFAULT 0,
        ip VARCHAR(45) NULL DEFAULT NULL,
        device_id VARCHAR(128) NULL DEFAULT NULL,
        user_agent VARCHAR(500) NULL DEFAULT NULL,
        country VARCHAR(64) NULL DEFAULT NULL,
        city VARCHAR(64) NULL DEFAULT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY idx_login_attempts_identifier_created (login_identifier, created_at),
        KEY idx_login_attempts_ip_created (ip, created_at),
        KEY idx_login_attempts_device_created (device_id, created_at),
        KEY idx_login_attempts_user_created (user_id, created_at),
        KEY idx_login_attempts_success_created (success, created_at),
        CONSTRAINT fk_login_attempts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS user_security_events (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        user_id VARCHAR(36) NULL DEFAULT NULL,
        event_type VARCHAR(64) NOT NULL,
        severity VARCHAR(16) NOT NULL DEFAULT 'info',
        title VARCHAR(191) NOT NULL,
        description TEXT NULL,
        ip VARCHAR(45) NULL DEFAULT NULL,
        device_id VARCHAR(128) NULL DEFAULT NULL,
        user_agent VARCHAR(500) NULL DEFAULT NULL,
        metadata JSON NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        resolved_at DATETIME NULL DEFAULT NULL,
        KEY idx_security_events_user_created (user_id, created_at),
        KEY idx_security_events_type_created (event_type, created_at),
        KEY idx_security_events_severity_created (severity, created_at),
        CONSTRAINT fk_security_events_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS security_risk_ip_blocks (
        ip VARCHAR(45) NOT NULL PRIMARY KEY,
        reason VARCHAR(128) NULL DEFAULT NULL,
        blocked_until DATETIME NULL DEFAULT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS security_risk_device_blocks (
        device_id VARCHAR(128) NOT NULL PRIMARY KEY,
        reason VARCHAR(128) NULL DEFAULT NULL,
        blocked_until DATETIME NULL DEFAULT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    const rules = [
      ['CLIENT_LOGIN_FAIL_RATE_HIGH', 'security', 'P1', '客户端登录失败率过高'],
      ['CLIENT_PASSWORD_SPRAY_DETECTED', 'security', 'P0', '客户端密码喷洒风险'],
      ['CLIENT_CREDENTIAL_STUFFING_DETECTED', 'security', 'P0', '客户端撞库风险'],
      ['CLIENT_REGISTER_RATE_HIGH', 'security', 'P1', '客户端注册频率过高'],
      ['CLIENT_HIGH_RISK_IP_ACTIVE', 'security', 'P1', '高风险 IP 活跃'],
      ['CLIENT_ACCOUNT_LOCKOUT_SPIKE', 'security', 'P0', '账号保护数量异常'],
      ['CLIENT_SESSION_ABNORMAL', 'security', 'P1', '客户端会话异常'],
    ];
    for (const [code, module, severity, name] of rules) {
      await query(`
        INSERT INTO data_consistency_rules (code, module, name, severity, enabled, schedule_cron, auto_fix_enabled)
        VALUES (?, ?, ?, ?, 1, '*/10 * * * *', 0)
        ON DUPLICATE KEY UPDATE module = VALUES(module), name = VALUES(name), severity = VALUES(severity)
      `, [code, module, name, severity]).catch(() => {});
    }
  },
};
