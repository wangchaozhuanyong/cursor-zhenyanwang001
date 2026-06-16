const { writeAuditLog } = require('../utils/auditLog');
const { formatAdminSecurityEventMessage } = require('../utils/adminSecurityEventMessage');

const SECURITY_EVENT_TITLES = {
  'security.rbac_change': '权限配置变更',
  'security.payment_config_change': '支付配置变更',
  'security.site_settings_change': '站点设置变更',
  'security.data_export': '后台数据导出',
  'security.permanent_delete': '永久删除操作',
  'security.payment_manual_change': '支付状态手动变更',
  'security.payment_event_replay': '支付事件重放',
  'security.payment_review': '支付人工复核',
  'security.refund_operation': '退款操作',
  'security.notification_config_change': '通知配置变更',
  'security.theme_change': '主题配置变更',
  'security.inventory_change': '库存变更',
  'security.return_operation': '售后操作',
  'security.export_operation': '数据导出操作',
  'security.product_change': '商品变更',
  'security.activity_rule_change': '活动规则变更',
  'security.coupon_config_change': '优惠券配置变更',
  'security.shipping_rule_change': '运费规则变更',
  'security.order_status_change': '订单状态变更',
  'security.user_points_change': '用户积分调整',
  'security.user_password_reset': '用户密码重置',
  'security.user_status_change': '用户账号状态变更',
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
  { pattern: /^\/payments\/events\/[^/]+\/review/, actionType: 'security.payment_review', objectType: 'payment_event' },
  { pattern: /^\/payments\/reconciliations\/[^/]+\/review/, actionType: 'security.payment_review', objectType: 'payment_reconciliation' },
  { pattern: /^\/settings(\/|$)/, actionType: 'security.site_settings_change', objectType: 'site_settings' },
  { pattern: /^\/telegram\/settings/, actionType: 'security.notification_config_change', objectType: 'site_settings' },
  { pattern: /^\/system\/theme/, actionType: 'security.theme_change', objectType: 'site_settings' },
  { pattern: /^\/inventory\//, actionType: 'security.inventory_change', objectType: 'inventory' },
  { pattern: /^\/returns\/[^/]+/, actionType: 'security.return_operation', objectType: 'return_request' },
  { pattern: /^\/recycle-bin\/[^/]+\/permanent-delete/, actionType: 'security.permanent_delete', objectType: 'recycle_bin' },
  { pattern: /^\/exports/, actionType: 'security.export_operation', objectType: 'export_task' },
  { pattern: /^\/products$/, actionType: 'security.product_change', objectType: 'product' },
  { pattern: /^\/products\/import$/, actionType: 'security.product_change', objectType: 'product' },
  { pattern: /^\/products\/batch-(status|delete)$/, actionType: 'security.product_change', objectType: 'product' },
  { pattern: /^\/products\/[^/]+$/, actionType: 'security.product_change', objectType: 'product' },
  { pattern: /^\/products\/[^/]+\/(tags|status)$/, actionType: 'security.product_change', objectType: 'product' },
  { pattern: /^\/activities$/, actionType: 'security.activity_rule_change', objectType: 'marketing_activity' },
  { pattern: /^\/activities\/[^/]+$/, actionType: 'security.activity_rule_change', objectType: 'marketing_activity' },
  { pattern: /^\/activities\/[^/]+\/status$/, actionType: 'security.activity_rule_change', objectType: 'marketing_activity' },
  { pattern: /^\/coupon-campaigns(\/|$)/, actionType: 'security.activity_rule_change', objectType: 'coupon_campaign' },
  { pattern: /^\/coupons(\/|$)/, actionType: 'security.coupon_config_change', objectType: 'coupon' },
  { pattern: /^\/shipping\/(templates|settings)(\/|$)/, actionType: 'security.shipping_rule_change', objectType: 'shipping_rule' },
  { pattern: /^\/orders\/[^/]+\/(status|ship|shortage-adjustment\/apply)/, actionType: 'security.order_status_change', objectType: 'order' },
  { pattern: /^\/orders\/batch-ship$/, actionType: 'security.order_status_change', objectType: 'order' },
  { pattern: /^\/users\/[^/]+\/points/, actionType: 'security.user_points_change', objectType: 'user' },
  { pattern: /^\/users\/[^/]+\/reset-password/, actionType: 'security.user_password_reset', objectType: 'user' },
  { pattern: /^\/users\/[^/]+\/account-status/, actionType: 'security.user_status_change', objectType: 'user' },
];

function routeIdFromPath(path = '') {
  const match = String(path || '').match(/^\/(?:activities|coupon-campaigns|coupons|products|orders|returns|payments\/(?:channels|events|reconciliations)|shipping\/templates|users|reviews|rbac\/(?:roles|admin-users)|inventory\/(?:skus|pack-rules|conversions|replenishment-alerts|purchase-orders)|recycle-bin)\/([^/]+)/);
  if (!match) return null;
  const id = decodeURIComponent(match[1] || '').trim();
  if (!id || ['batch-status', 'batch-delete', 'batch-ship', 'export', 'import'].includes(id)) return null;
  return id;
}

function routeId(req) {
  return req.params?.id
    || req.params?.eventId
    || req.params?.orderId
    || req.params?.userId
    || req.params?.productId
    || routeIdFromPath(req.path)
    || null;
}

function classifyAdminOperation(req) {
  if (/^\/auth\//.test(req.path)) return null;
  if (req.method === 'GET' && EXPORT_ROUTES.some((pattern) => pattern.test(req.path))) {
    return { actionType: 'security.data_export', objectType: 'export', objectId: routeId(req) };
  }
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return null;
  const matched = MUTATION_ROUTES.find((r) => r.pattern.test(req.path));
  if (!matched) return null;
  return {
    actionType: matched.actionType,
    objectType: matched.objectType,
    objectId: routeId(req),
  };
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
    if (success) {
      const eventTitle = SECURITY_EVENT_TITLES[meta.actionType];
      if (!eventTitle) return;
      try {
        const adminEventService = require('../modules/admin/service/adminEvent.service');
        void adminEventService.emitEvent({
          eventType: meta.actionType,
          category: 'security',
          title: eventTitle,
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
