/**
 * Admin high-risk route matching for recent-MFA middleware.
 * Paths are relative to the admin router (e.g. /products/import, not /api/admin/...).
 */

const EXPORT_READ_PATTERNS = [
  /^\/orders\/export$/,
  /^\/users\/export$/,
  /^\/inventory\/export$/,
  /^\/inventory\/records\/export$/,
  /^\/reports\/export$/,
  /^\/reports\/[^/]+\/export$/,
  /^\/reports\/profit\/export$/,
  /^\/exports\/[^/]+\/download$/,
  /^\/notifications\/[^/]+\/recipients\/export$/,
];

const MUTATING_PATTERNS = [
  /^\/account\/password$/,
  /^\/rbac\//,
  /^\/payments\/channels/,
  /^\/payments\/orders\/[^/]+\/refund/,
  /^\/payments\/orders\/[^/]+\/mark-paid/,
  /^\/payments\/events\/[^/]+\/replay/,
  /^\/payments\/reconciliations/,
  /^\/settings(\/|$)/,
  /^\/telegram\/settings/,
  /^\/system\/theme/,
  /^\/shipping\/settings/,
  /^\/points\/settings/,
  /^\/points\/rules/,
  /^\/referral-rules/,
  /^\/home-ops\/settings/,
  /^\/notifications\/trigger-settings/,
  /^\/backups\//,
  /^\/restore\//,
  /^\/inventory\//,
  /^\/orders\/[^/]+\/refund/,
  /^\/returns\/[^/]+/,
  /^\/recycle-bin\/[^/]+\/restore$/,
  /^\/recycle-bin\/[^/]+\/permanent-delete/,
  /^\/exports/,
  /^\/products(\/|$)/,
  /^\/product-tags(\/|$)/,
];

function isHighRiskAdminOperation(req) {
  const exportReadPatterns = EXPORT_READ_PATTERNS;
  if (req.method === 'GET') {
    return exportReadPatterns.some((pattern) => pattern.test(req.path));
  }

  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return false;
  return MUTATING_PATTERNS.some((pattern) => pattern.test(req.path));
}

module.exports = {
  isHighRiskAdminOperation,
  EXPORT_READ_PATTERNS,
  MUTATING_PATTERNS,
};
