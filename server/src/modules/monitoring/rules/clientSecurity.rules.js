const db = require('../../../config/db');
const repo = require('../repository/monitoring.repository');

async function countRows(sql, params = []) {
  const [[row]] = await db.query(sql, params);
  return Number(row?.c || 0);
}

function anomaly(ruleCode, severity, title, actualValue, threshold, evidence = {}) {
  return {
    ruleCode,
    module: 'security',
    severity,
    entityType: 'security',
    entityId: ruleCode,
    title,
    expectedValue: { threshold },
    actualValue,
    diffValue: { over: Math.max(0, Number(actualValue.count || 0) - threshold) },
    evidence,
    rootCauseCode: 'CLIENT_SECURITY_RISK',
    rootCauseMessage: '客户端账号安全风控指标超过阈值。',
    autoFixable: false,
    repairSuggestion: { repairType: 'manual_review', description: '进入用户安全中心查看来源 IP、设备和账号。' },
  };
}

async function loginFailRateHigh() {
  if (!(await repo.tableExists('user_login_attempts'))) return { checkedCount: 0, anomalies: [] };
  const count = await countRows(
    `SELECT COUNT(*) AS c FROM user_login_attempts WHERE success = 0 AND created_at >= DATE_SUB(NOW(), INTERVAL 10 MINUTE)`,
  );
  return { checkedCount: 1, anomalies: count > 100 ? [anomaly('CLIENT_LOGIN_FAIL_RATE_HIGH', 'P1', '客户端 10 分钟登录失败数过高', { count }, 100)] : [] };
}

async function securityEventRule(ruleCode, eventType, severity, title, threshold) {
  if (!(await repo.tableExists('user_security_events'))) return { checkedCount: 0, anomalies: [] };
  const count = await countRows(
    `SELECT COUNT(*) AS c FROM user_security_events WHERE event_type = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 30 MINUTE)`,
    [eventType],
  );
  return { checkedCount: 1, anomalies: count >= threshold ? [anomaly(ruleCode, severity, title, { count, eventType }, threshold)] : [] };
}

async function registerRateHigh() {
  if (!(await repo.tableExists('user_security_events'))) return { checkedCount: 0, anomalies: [] };
  const count = await countRows(
    `SELECT COUNT(*) AS c FROM user_security_events WHERE event_type = 'mass_register_detected' AND created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)`,
  );
  return { checkedCount: 1, anomalies: count > 0 ? [anomaly('CLIENT_REGISTER_RATE_HIGH', 'P1', '客户端批量注册风险活跃', { count }, 1)] : [] };
}

async function highRiskIpActive() {
  if (!(await repo.tableExists('security_risk_ip_blocks'))) return { checkedCount: 0, anomalies: [] };
  const count = await countRows(`SELECT COUNT(*) AS c FROM security_risk_ip_blocks WHERE blocked_until IS NULL OR blocked_until > NOW()`);
  return { checkedCount: 1, anomalies: count > 0 ? [anomaly('CLIENT_HIGH_RISK_IP_ACTIVE', 'P1', '当前存在高风险 IP 封禁', { count }, 1)] : [] };
}

async function accountLockoutSpike() {
  if (!(await repo.tableExists('users'))) return { checkedCount: 0, anomalies: [] };
  const count = await countRows(`SELECT COUNT(*) AS c FROM users WHERE protected_until > NOW()`);
  return { checkedCount: 1, anomalies: count >= 10 ? [anomaly('CLIENT_ACCOUNT_LOCKOUT_SPIKE', 'P0', '被保护账号数量异常升高', { count }, 10)] : [] };
}

async function sessionAbnormal() {
  return securityEventRule('CLIENT_SESSION_ABNORMAL', 'sessions_revoked', 'P1', '客户端会话异常撤销频繁', 5);
}

module.exports = {
  CLIENT_LOGIN_FAIL_RATE_HIGH: loginFailRateHigh,
  CLIENT_PASSWORD_SPRAY_DETECTED: () => securityEventRule('CLIENT_PASSWORD_SPRAY_DETECTED', 'password_spray_detected', 'P0', '检测到客户端密码喷洒', 1),
  CLIENT_CREDENTIAL_STUFFING_DETECTED: () => securityEventRule('CLIENT_CREDENTIAL_STUFFING_DETECTED', 'credential_stuffing_detected', 'P0', '检测到客户端撞库风险', 1),
  CLIENT_REGISTER_RATE_HIGH: registerRateHigh,
  CLIENT_HIGH_RISK_IP_ACTIVE: highRiskIpActive,
  CLIENT_ACCOUNT_LOCKOUT_SPIKE: accountLockoutSpike,
  CLIENT_SESSION_ABNORMAL: sessionAbnormal,
};
