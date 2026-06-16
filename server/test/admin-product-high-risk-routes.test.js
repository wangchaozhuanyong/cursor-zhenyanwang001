const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { getSensitiveActionClass, isHighRiskAdminOperation } = require('../src/modules/admin/adminHighRiskRoutes');
const { classifyAdminOperation } = require('../src/middleware/adminSecurityAudit');

function req(method, path) {
  return { method, path };
}

describe('admin sensitive action routes', () => {
  test('product catalog mutations require step-up because price and inventory-facing fields are high-risk', () => {
    assert.equal(getSensitiveActionClass(req('POST', '/products')), 'product_catalog_change');
    assert.equal(getSensitiveActionClass(req('PUT', '/products/prod-1')), 'product_catalog_change');
    assert.equal(getSensitiveActionClass(req('PATCH', '/products/prod-1/status')), 'product_catalog_change');
    assert.equal(getSensitiveActionClass(req('DELETE', '/products/prod-1')), 'bulk_delete');
    assert.equal(isHighRiskAdminOperation(req('PUT', '/products/prod-1')), true);
  });

  test('batch product mutation is classified', () => {
    assert.equal(getSensitiveActionClass(req('POST', '/products/batch-status')), 'bulk_price');
    assert.equal(getSensitiveActionClass(req('POST', '/products/batch-delete')), 'bulk_delete');
  });

  test('customer exports are classified', () => {
    assert.equal(getSensitiveActionClass(req('GET', '/event-center/events/export')), 'customer_export');
    assert.equal(getSensitiveActionClass(req('GET', '/products/export')), 'customer_export');
    assert.equal(getSensitiveActionClass(req('GET', '/inventory/export')), 'customer_export');
    assert.equal(getSensitiveActionClass(req('GET', '/inventory/records/export')), 'customer_export');
    assert.equal(getSensitiveActionClass(req('GET', '/users/export')), 'customer_export');
    assert.equal(getSensitiveActionClass(req('GET', '/orders/export')), 'customer_export');
    assert.equal(getSensitiveActionClass(req('GET', '/reports/export')), 'customer_export');
    assert.equal(getSensitiveActionClass(req('GET', '/reports/sales/export')), 'customer_export');
    assert.equal(getSensitiveActionClass(req('GET', '/reports/profit/export')), 'customer_export');
    assert.equal(getSensitiveActionClass(req('GET', '/reports/products/export')), 'customer_export');
    assert.equal(getSensitiveActionClass(req('GET', '/reports/users/export')), 'customer_export');
  });

  test('admin security and RBAC mutations are classified', () => {
    assert.equal(getSensitiveActionClass(req('PUT', '/account/password')), 'account_security');
    assert.equal(getSensitiveActionClass(req('PUT', '/rbac/mfa-policy')), 'rbac_admin');
    assert.equal(getSensitiveActionClass(req('PUT', '/rbac/users/u-1/roles')), 'rbac_admin');
    assert.equal(getSensitiveActionClass(req('POST', '/rbac/admin-users/u-1/security/mfa-reset')), 'rbac_admin');
  });

  test('payment manual state changes are classified', () => {
    assert.equal(getSensitiveActionClass(req('POST', '/payments/orders/order-1/mark-paid')), 'payment_manual_change');
  });

  test('order fulfillment and status mutations are classified', () => {
    assert.equal(getSensitiveActionClass(req('PUT', '/orders/order-1/status')), 'order_status_change');
    assert.equal(getSensitiveActionClass(req('POST', '/orders/order-1/shortage-adjustment/apply')), 'order_status_change');
    assert.equal(getSensitiveActionClass(req('PUT', '/orders/order-1/ship')), 'order_status_change');
    assert.equal(getSensitiveActionClass(req('POST', '/orders/batch-ship')), 'order_status_change');
  });

  test('activity, coupon, and shipping rule mutations are classified without blocking read-only prechecks', () => {
    assert.equal(getSensitiveActionClass(req('POST', '/activities')), 'activity_rule_change');
    assert.equal(getSensitiveActionClass(req('PUT', '/activities/activity-1')), 'activity_rule_change');
    assert.equal(getSensitiveActionClass(req('POST', '/activities/activity-1/copy')), 'activity_rule_change');
    assert.equal(getSensitiveActionClass(req('PATCH', '/activities/activity-1/status')), 'activity_rule_change');
    assert.equal(getSensitiveActionClass(req('DELETE', '/activities/activity-1')), 'activity_rule_change');
    assert.equal(getSensitiveActionClass(req('POST', '/activities/precheck')), '');
    assert.equal(getSensitiveActionClass(req('POST', '/activities/activity-1/precheck')), '');
    assert.equal(getSensitiveActionClass(req('POST', '/activities/activity-1/validate')), '');

    assert.equal(getSensitiveActionClass(req('POST', '/coupon-campaigns')), 'activity_rule_change');
    assert.equal(getSensitiveActionClass(req('PATCH', '/coupon-campaigns/campaign-1/status')), 'activity_rule_change');
    assert.equal(getSensitiveActionClass(req('POST', '/coupons/coupon-1/invalidate-user-coupons')), 'coupon_config_change');
    assert.equal(getSensitiveActionClass(req('POST', '/coupons/coupon-1/issue-by-tag')), 'coupon_config_change');

    assert.equal(getSensitiveActionClass(req('POST', '/shipping/templates')), 'shipping_rule_change');
    assert.equal(getSensitiveActionClass(req('PUT', '/shipping/templates/template-1')), 'shipping_rule_change');
    assert.equal(getSensitiveActionClass(req('DELETE', '/shipping/templates/template-1')), 'shipping_rule_change');
  });

  test('high-risk config and permanent delete are classified', () => {
    assert.equal(getSensitiveActionClass(req('PUT', '/settings')), 'high_risk_config');
    assert.equal(getSensitiveActionClass(req('POST', '/recycle-bin/item-1/permanent-delete')), 'bulk_delete');
  });

  test('backup read endpoints do not require MFA step-up', () => {
    assert.equal(getSensitiveActionClass(req('GET', '/backups/overview')), '');
    assert.equal(getSensitiveActionClass(req('GET', '/backups/health')), '');
    assert.equal(getSensitiveActionClass(req('GET', '/backups/files')), '');
    assert.equal(getSensitiveActionClass(req('GET', '/backups/alerts')), '');
    assert.equal(getSensitiveActionClass(req('GET', '/restore/jobs')), '');
    assert.equal(getSensitiveActionClass(req('GET', '/restore/drills')), '');
  });

  test('backup write endpoints require high-risk MFA step-up', () => {
    assert.equal(getSensitiveActionClass(req('POST', '/backups/full')), 'high_risk_config');
    assert.equal(getSensitiveActionClass(req('POST', '/backups/config')), 'high_risk_config');
    assert.equal(getSensitiveActionClass(req('POST', '/backups/uploads')), 'high_risk_config');
    assert.equal(getSensitiveActionClass(req('POST', '/restore/jobs')), 'high_risk_config');
    assert.equal(getSensitiveActionClass(req('POST', '/restore/jobs/job-1/approve')), 'high_risk_config');
    assert.equal(getSensitiveActionClass(req('POST', '/restore/jobs/job-1/switch')), 'high_risk_config');
  });

  test('security audit classifies high-risk commerce operations and ignores activity precheck', () => {
    assert.deepEqual(classifyAdminOperation(req('PUT', '/activities/activity-1')), {
      actionType: 'security.activity_rule_change',
      objectType: 'marketing_activity',
      objectId: 'activity-1',
    });
    assert.deepEqual(classifyAdminOperation(req('POST', '/activities/activity-1/precheck')), null);
    assert.deepEqual(classifyAdminOperation(req('POST', '/coupons/coupon-1/invalidate-user-coupons')), {
      actionType: 'security.coupon_config_change',
      objectType: 'coupon',
      objectId: 'coupon-1',
    });
    assert.deepEqual(classifyAdminOperation(req('PUT', '/shipping/templates/template-1')), {
      actionType: 'security.shipping_rule_change',
      objectType: 'shipping_rule',
      objectId: 'template-1',
    });
    assert.deepEqual(classifyAdminOperation(req('PUT', '/orders/order-1/status')), {
      actionType: 'security.order_status_change',
      objectType: 'order',
      objectId: 'order-1',
    });
  });
});
