/**
 * Admin sensitive-action route classification.
 * Paths are relative to /api/admin.
 */

const RULES = [
  { method: 'PUT', pattern: /^\/account\/password$/, actionClass: 'account_security' },

  { method: '*', pattern: /^\/rbac\/users\/[^/]+\/roles$/, actionClass: 'rbac_admin' },
  { method: '*', pattern: /^\/rbac\/roles(\/|$)/, actionClass: 'rbac_admin' },
  { method: 'POST', pattern: /^\/rbac\/admin-users$/, actionClass: 'rbac_admin' },
  { method: '*', pattern: /^\/rbac\/admin-users\/[^/]+\/(security|toggle|reset-password|delete)/, actionClass: 'rbac_admin' },
  { method: 'DELETE', pattern: /^\/rbac\/admin-users\/[^/]+$/, actionClass: 'rbac_admin' },

  { method: 'PUT', pattern: /^\/payments\/channels\/[^/]+$/, actionClass: 'payment_config' },
  { method: 'POST', pattern: /^\/payments\/orders\/[^/]+\/refund$/, actionClass: 'bulk_refund' },
  { method: 'POST', pattern: /^\/payments\/events\/[^/]+\/replay$/, actionClass: 'payment_config' },
  { method: 'POST', pattern: /^\/payments\/reconciliations$/, actionClass: 'payment_config' },

  { method: 'GET', pattern: /^\/users\/export$/, actionClass: 'customer_export' },
  { method: 'GET', pattern: /^\/orders\/export$/, actionClass: 'customer_export' },
  { method: 'GET', pattern: /^\/reports\/(users|customers)\/export$/, actionClass: 'customer_export' },
  { method: 'GET', pattern: /^\/notifications\/[^/]+\/recipients\/export$/, actionClass: 'customer_export' },
  { method: 'GET', pattern: /^\/exports\/[^/]+\/download$/, actionClass: 'customer_export' },

  { method: 'POST', pattern: /^\/exports$/, actionClass: 'customer_export' },
  { method: 'POST', pattern: /^\/products\/batch-status$/, actionClass: 'bulk_price' },
  { method: 'POST', pattern: /^\/reviews\/batch-delete$/, actionClass: 'bulk_delete' },
  { method: 'POST', pattern: /^\/reviews\/batch-hide$/, actionClass: 'bulk_delete' },
  { method: '*', pattern: /^\/recycle-bin\/[^/]+\/permanent-delete$/, actionClass: 'bulk_delete' },
  { method: 'POST', pattern: /^\/orders\/[^/]+\/refund$/, actionClass: 'bulk_refund' },

  { method: '*', pattern: /^\/inventory\/(pack-rules|conversions|replenishment-alerts|purchase-orders)/, actionClass: 'bulk_inventory' },

  { method: 'PUT', pattern: /^\/settings(\/|$)/, actionClass: 'high_risk_config' },
  { method: 'POST', pattern: /^\/settings\/assets\//, actionClass: 'high_risk_config' },
  { method: 'PUT', pattern: /^\/telegram\/settings$/, actionClass: 'high_risk_config' },
  { method: 'PUT', pattern: /^\/system\/theme/, actionClass: 'high_risk_config' },
  { method: 'PUT', pattern: /^\/shipping\/settings$/, actionClass: 'high_risk_config' },
  { method: 'PUT', pattern: /^\/points\/settings$/, actionClass: 'high_risk_config' },
  { method: 'PUT', pattern: /^\/points\/rules\/[^/]+$/, actionClass: 'high_risk_config' },
  { method: 'PUT', pattern: /^\/referral-rules\/[^/]+$/, actionClass: 'high_risk_config' },
  { method: 'PUT', pattern: /^\/rewards\/settings$/, actionClass: 'high_risk_config' },
  { method: 'PUT', pattern: /^\/notifications\/trigger-settings$/, actionClass: 'high_risk_config' },
  { method: 'POST', pattern: /^\/backups\/full$/, actionClass: 'high_risk_config' },
  { method: 'POST', pattern: /^\/restore\/jobs$/, actionClass: 'high_risk_config' },
  { method: 'POST', pattern: /^\/restore\/jobs\/[^/]+\/approve$/, actionClass: 'high_risk_config' },
  { method: 'POST', pattern: /^\/restore\/jobs\/[^/]+\/switch$/, actionClass: 'high_risk_config' },
];

function getSensitiveActionClass(req) {
  const method = String(req.method || 'GET').toUpperCase();
  const match = RULES.find((rule) => (rule.method === '*' || rule.method === method) && rule.pattern.test(req.path));
  return match?.actionClass || '';
}

function isHighRiskAdminOperation(req) {
  return Boolean(getSensitiveActionClass(req));
}

module.exports = {
  getSensitiveActionClass,
  isHighRiskAdminOperation,
  RULES,
};
