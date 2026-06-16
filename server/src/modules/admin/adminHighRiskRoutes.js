/**
 * Admin sensitive-action route classification.
 * Paths are relative to /api/admin.
 */

const RULES = [
  { method: 'PUT', pattern: /^\/account\/password$/, actionClass: 'account_security' },

  { method: '*', pattern: /^\/rbac\/users\/[^/]+\/roles$/, actionClass: 'rbac_admin' },
  { method: '*', pattern: /^\/rbac\/roles(\/|$)/, actionClass: 'rbac_admin' },
  { method: 'PUT', pattern: /^\/rbac\/mfa-policy$/, actionClass: 'rbac_admin' },
  { method: 'POST', pattern: /^\/rbac\/admin-users$/, actionClass: 'rbac_admin' },
  { method: '*', pattern: /^\/rbac\/admin-users\/[^/]+\/(security|toggle|reset-password|delete)/, actionClass: 'rbac_admin' },
  { method: 'DELETE', pattern: /^\/rbac\/admin-users\/[^/]+$/, actionClass: 'rbac_admin' },

  { method: 'PUT', pattern: /^\/payments\/channels\/[^/]+$/, actionClass: 'payment_config' },
  { method: 'POST', pattern: /^\/payments\/orders\/[^/]+\/refund$/, actionClass: 'bulk_refund' },
  { method: 'POST', pattern: /^\/payments\/orders\/[^/]+\/mark-paid$/, actionClass: 'payment_manual_change' },
  { method: 'POST', pattern: /^\/payments\/events\/[^/]+\/replay$/, actionClass: 'payment_config' },
  { method: 'PATCH', pattern: /^\/payments\/events\/[^/]+\/review$/, actionClass: 'payment_config' },
  { method: 'POST', pattern: /^\/payments\/reconciliations$/, actionClass: 'payment_config' },
  { method: 'PATCH', pattern: /^\/payments\/reconciliations\/[^/]+\/review$/, actionClass: 'payment_config' },

  { method: 'GET', pattern: /^\/event-center\/events\/export$/, actionClass: 'customer_export' },
  { method: 'GET', pattern: /^\/products\/export$/, actionClass: 'customer_export' },
  { method: 'GET', pattern: /^\/inventory\/(records\/)?export$/, actionClass: 'customer_export' },
  { method: 'GET', pattern: /^\/users\/export$/, actionClass: 'customer_export' },
  { method: 'GET', pattern: /^\/orders\/export$/, actionClass: 'customer_export' },
  { method: 'GET', pattern: /^\/reports\/export$/, actionClass: 'customer_export' },
  { method: 'GET', pattern: /^\/reports\/[^/]+\/export$/, actionClass: 'customer_export' },
  { method: 'GET', pattern: /^\/notifications\/[^/]+\/recipients\/export$/, actionClass: 'customer_export' },
  { method: 'GET', pattern: /^\/exports\/[^/]+\/download$/, actionClass: 'customer_export' },

  { method: 'POST', pattern: /^\/exports$/, actionClass: 'customer_export' },
  { method: 'POST', pattern: /^\/products$/, actionClass: 'product_catalog_change' },
  { method: 'PUT', pattern: /^\/products\/[^/]+$/, actionClass: 'product_catalog_change' },
  { method: 'PATCH', pattern: /^\/products\/[^/]+\/status$/, actionClass: 'product_catalog_change' },
  { method: 'DELETE', pattern: /^\/products\/[^/]+$/, actionClass: 'bulk_delete' },
  { method: 'POST', pattern: /^\/products\/batch-status$/, actionClass: 'bulk_price' },
  { method: 'POST', pattern: /^\/products\/batch-delete$/, actionClass: 'bulk_delete' },
  { method: 'POST', pattern: /^\/reviews\/batch-delete$/, actionClass: 'bulk_delete' },
  { method: 'POST', pattern: /^\/reviews\/batch-hide$/, actionClass: 'bulk_delete' },
  { method: '*', pattern: /^\/recycle-bin\/[^/]+\/permanent-delete$/, actionClass: 'bulk_delete' },
  { method: 'PUT', pattern: /^\/orders\/[^/]+\/status$/, actionClass: 'order_status_change' },
  { method: 'POST', pattern: /^\/orders\/[^/]+\/shortage-adjustment\/apply$/, actionClass: 'order_status_change' },
  { method: 'PUT', pattern: /^\/orders\/[^/]+\/ship$/, actionClass: 'order_status_change' },
  { method: 'POST', pattern: /^\/orders\/batch-ship$/, actionClass: 'order_status_change' },
  { method: 'POST', pattern: /^\/orders\/[^/]+\/refund$/, actionClass: 'bulk_refund' },

  { method: '*', pattern: /^\/inventory\/(pack-rules|conversions|replenishment-alerts|purchase-orders)/, actionClass: 'bulk_inventory' },
  { method: '*', pattern: /^\/inventory\/(batch-warning-threshold|batch-adjust|skus\/[^/]+\/adjust|skus\/[^/]+\/warning-threshold|products\/[^/]+\/adjust)/, actionClass: 'bulk_inventory' },

  { method: 'POST', pattern: /^\/activities$/, actionClass: 'activity_rule_change' },
  { method: 'PUT', pattern: /^\/activities\/[^/]+$/, actionClass: 'activity_rule_change' },
  { method: 'POST', pattern: /^\/activities\/[^/]+\/copy$/, actionClass: 'activity_rule_change' },
  { method: 'PATCH', pattern: /^\/activities\/[^/]+\/status$/, actionClass: 'activity_rule_change' },
  { method: 'DELETE', pattern: /^\/activities\/[^/]+$/, actionClass: 'activity_rule_change' },
  { method: 'POST', pattern: /^\/coupon-campaigns$/, actionClass: 'activity_rule_change' },
  { method: 'PUT', pattern: /^\/coupon-campaigns\/[^/]+$/, actionClass: 'activity_rule_change' },
  { method: 'PATCH', pattern: /^\/coupon-campaigns\/[^/]+\/status$/, actionClass: 'activity_rule_change' },
  { method: 'DELETE', pattern: /^\/coupon-campaigns\/[^/]+$/, actionClass: 'activity_rule_change' },
  { method: 'POST', pattern: /^\/coupons$/, actionClass: 'coupon_config_change' },
  { method: 'PUT', pattern: /^\/coupons\/[^/]+$/, actionClass: 'coupon_config_change' },
  { method: 'DELETE', pattern: /^\/coupons\/[^/]+$/, actionClass: 'coupon_config_change' },
  { method: 'POST', pattern: /^\/coupons\/[^/]+\/(pause-claim|disable-use|archive|invalidate-user-coupons|issue-by-tag)$/, actionClass: 'coupon_config_change' },

  { method: 'PUT', pattern: /^\/settings(\/|$)/, actionClass: 'high_risk_config' },
  { method: 'POST', pattern: /^\/settings\/assets\//, actionClass: 'high_risk_config' },
  { method: 'PUT', pattern: /^\/telegram\/settings$/, actionClass: 'high_risk_config' },
  { method: 'PUT', pattern: /^\/system\/theme/, actionClass: 'high_risk_config' },
  { method: 'PUT', pattern: /^\/shipping\/settings$/, actionClass: 'high_risk_config' },
  { method: 'POST', pattern: /^\/shipping\/templates$/, actionClass: 'shipping_rule_change' },
  { method: 'PUT', pattern: /^\/shipping\/templates\/[^/]+$/, actionClass: 'shipping_rule_change' },
  { method: 'DELETE', pattern: /^\/shipping\/templates\/[^/]+$/, actionClass: 'shipping_rule_change' },
  { method: 'PUT', pattern: /^\/points\/settings$/, actionClass: 'high_risk_config' },
  { method: 'PUT', pattern: /^\/points\/rules\/[^/]+$/, actionClass: 'high_risk_config' },
  { method: 'PUT', pattern: /^\/referral-rules\/[^/]+$/, actionClass: 'high_risk_config' },
  { method: 'PUT', pattern: /^\/rewards\/settings$/, actionClass: 'high_risk_config' },
  { method: 'PUT', pattern: /^\/notifications\/trigger-settings$/, actionClass: 'high_risk_config' },
  { method: 'POST', pattern: /^\/backups\/full$/, actionClass: 'high_risk_config' },
  { method: 'POST', pattern: /^\/backups\/config$/, actionClass: 'high_risk_config' },
  { method: 'POST', pattern: /^\/backups\/uploads$/, actionClass: 'high_risk_config' },
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
