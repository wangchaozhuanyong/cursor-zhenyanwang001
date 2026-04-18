/**
 * 正式审计日志（与 admin_logs 并存）
 */
module.exports = {
  async up(query) {
    await query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id              VARCHAR(36)   NOT NULL PRIMARY KEY,
        operator_id     VARCHAR(36)   DEFAULT NULL,
        operator_name   VARCHAR(100)  NOT NULL DEFAULT '',
        operator_role   VARCHAR(50)   NOT NULL DEFAULT '',
        action_type     VARCHAR(80)   NOT NULL,
        object_type     VARCHAR(80)   NOT NULL DEFAULT '',
        object_id       VARCHAR(36)   DEFAULT NULL,
        summary         VARCHAR(500)  NOT NULL DEFAULT '',
        before_json     JSON          DEFAULT NULL,
        after_json      JSON          DEFAULT NULL,
        ip              VARCHAR(45)   NOT NULL DEFAULT '',
        user_agent      VARCHAR(500)  NOT NULL DEFAULT '',
        request_path    VARCHAR(255)  NOT NULL DEFAULT '',
        request_method  VARCHAR(10)   NOT NULL DEFAULT '',
        result          ENUM('success','failure') NOT NULL DEFAULT 'success',
        error_message   VARCHAR(500)  NOT NULL DEFAULT '',
        created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_audit_operator (operator_id),
        INDEX idx_audit_object (object_type, object_id),
        INDEX idx_audit_action (action_type),
        INDEX idx_audit_created (created_at),
        INDEX idx_audit_result (result)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  },
};
