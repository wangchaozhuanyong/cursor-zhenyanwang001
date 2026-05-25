const { writeAuditLog } = require('../utils/auditLog');
const { formatAdminSecurityEventMessage } = require('../utils/adminSecurityEventMessage');

const SECURITY_EVENT_TITLES = {
  'security.rbac_change': '权限配置变更',
  'security.payment_config_change': '支付配置变更',
  'security.site_settings_change': '站点设置变更',
  'security.data_export': '后台数据导出',
  'security.permanent_delete': '永久删除操作',
};

const EXPORT_ROUTES = [
  /^\/orders\/export$/,
  /^\/users\/export$/,
  /^\/products\/export$/,
  /^\/inventory\/export$/,
  /^\/inventory\/records\/export$/,
  /^\/reports\/.+\/export$/,
  /^\/reports\/export$/,
  /^\/exports\/[^/]+\/download$/,
  /^\/notifications\/[^/]+\/recipients\/export$/,
];

const MUTATION_ROUTES = [
  { pattern: /^\/rbac\//, actionType: 'security.rbac_change', objectType: 'rbac' },
  { pattern: /^\/payments\/channels/, actionType: 'security.payment_config_change', objectType: 'payment_channel' },
  { pattern: /^\/payments\/orders\/[^/]+\/refund/, actionType: 'security.refund_operation', objectType: 'payment' },
  { pattern: /^\/payments\/orders\/[^/]+\/mark-paid/, actionType: 'security.payment_manual_change', objectType: 'payment' },
  { pattern: /^\/payments\/events\/[^/]+\/replay/, actionType: 'security.payment_event_replay', objectType: 'payment_event' },
  { pattern: /^\/settings(\/|$)/, actionType: 'security.site_settings_change', objectType: 'site_settings' },
  { pattern: /^\/telegram\/settings/, actionType: 'security.notification_config_change', objectType: 'site_settings' },
  { pattern: /^\/system\/theme/, actionType: 'security.theme_change', objectType: 'site_settings' },
  { pattern: /^\/inventory\//, actionType: 'security.inventory_change', objectType: 'inventory' },
  { pattern: /^\/returns\/[^/]+/, actionType: 'security.return_operation', objectType: 'return_request' },
  { pattern: /^\/recycle-bin\/[^/]+\/permanent-delete/, actionType: 'security.permanent_delete', objectType: 'recycle_bin' },
  { pattern: /^\/exports/, actionType: 'security.export_operation', objectType: 'export_task' },
  { pattern: /^\/products\/[^/]+/, actionType: 'security.product_change', objectType: 'product' },
  { pattern: /^\/users\/[^/]+\/points/, actionType: 'security.user_points_change', objectType: 'user' },
  { pattern: /^\/users\/[^/]+\/reset-password/, actionType: 'security.user_password_reset', objectType: 'user' },
  { pattern: /^\/users\/[^/]+\/account-status/, actionType: 'security.user_status_change', objectType: 'user' },
];

function routeId(req) {
  return req.params?.id || req.params?.orderId || req.params?.userId || req.params?.productId || null;
}

function classifyAdminOperation(req) {
  if (/^\/auth\//.test(req.path)) return null;
  if (req.method === 'GET' && EXPORT_ROUTES.some((pattern) => pattern.test(req.path))) {
    return { actionType: 'security.data_export', objectType: 'export', objectId: routeId(req) };
  }
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return null;
  const matched = MUTATION_ROUTES.find((r) => r.pattern.test(req.path));
  if (!matched) return null;
  return { ...matched, objectId: routeId(req) };
}

function adminSecurityAudit(req, res, next) {
  const meta = classifyAdminOperation(req);
  if (!meta) return next();

  res.on('finish', () => {
    const success = res.statusCode < 400;
    void writeAuditLog({
      req,
      operatorId: req.user?.id || null,
      actionType: meta.actionType,
      objectType: meta.objectType,
      objectId: meta.objectId,
      summary: `${req.method} ${req.path} ${success ? 'allowed' : 'failed'}`,
      after: {
        statusCode: res.statusCode,
        query: req.query,
        bodyKeys: req.body && typeof req.body === 'object' ? Object.keys(req.body).slice(0, 50) : [],
      },
      result: success ? 'success' : 'failure',
      errorMessage: success ? '' : `HTTP ${res.statusCode}`,
    });
    if (success && SECURITY_EVENT_TITLES[meta.actionType]) {
      try {
        const adminEventService = require('../modules/admin/service/adminEvent.service');
        void adminEventService.emitEvent({
          eventType: meta.actionType,
          category: 'security',
          title: SECURITY_EVENT_TITLES[meta.actionType],
          message: formatAdminSecurityEventMessage(req.method, req.path),
          entityType: meta.objectType,
          entityId: meta.objectId || req.path,
          fingerprint: {
            eventType: meta.actionType,
            objectType: meta.objectType,
            objectId: meta.objectId || req.path,
            method: req.method,
            path: req.path,
          },
          payload: {
            method: req.method,
            path: req.path,
            query: req.query,
            bodyKeys: req.body && typeof req.body === 'object' ? Object.keys(req.body).slice(0, 50) : [],
          },
          source: 'admin_security_audit',
        }, { operatorId: req.user?.id || null, operatorType: 'admin' });
      } catch (error) {
        console.warn('[adminSecurityAudit] event emit failed:', error?.message || error);
      }
    }
  });

  return next();
}

module.exports = {
  adminSecurityAudit,
  classifyAdminOperation,
};
