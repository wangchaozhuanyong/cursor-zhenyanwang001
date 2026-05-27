const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { getSensitiveActionClass, isHighRiskAdminOperation } = require('../src/modules/admin/adminHighRiskRoutes');

function req(method, path) {
  return { method, path };
}

describe('admin sensitive action routes', () => {
  test('ordinary product mutations are not step-up operations', () => {
    assert.equal(isHighRiskAdminOperation(req('POST', '/products')), false);
    assert.equal(isHighRiskAdminOperation(req('PUT', '/products/prod-1')), false);
    assert.equal(isHighRiskAdminOperation(req('DELETE', '/products/prod-1')), false);
  });

  test('batch product mutation is classified', () => {
    assert.equal(getSensitiveActionClass(req('POST', '/products/batch-status')), 'bulk_price');
  });

  test('customer exports are classified', () => {
    assert.equal(getSensitiveActionClass(req('GET', '/users/export')), 'customer_export');
    assert.equal(getSensitiveActionClass(req('GET', '/orders/export')), 'customer_export');
  });

  test('admin security and RBAC mutations are classified', () => {
    assert.equal(getSensitiveActionClass(req('PUT', '/account/password')), 'account_security');
    assert.equal(getSensitiveActionClass(req('PUT', '/rbac/users/u-1/roles')), 'rbac_admin');
    assert.equal(getSensitiveActionClass(req('POST', '/rbac/admin-users/u-1/security/mfa-reset')), 'rbac_admin');
  });

  test('high-risk config and permanent delete are classified', () => {
    assert.equal(getSensitiveActionClass(req('PUT', '/settings')), 'high_risk_config');
    assert.equal(getSensitiveActionClass(req('POST', '/recycle-bin/item-1/permanent-delete')), 'bulk_delete');
  });

  test('backup read endpoints do not require MFA step-up', () => {
    assert.equal(getSensitiveActionClass(req('GET', '/backups/overview')), '');
    assert.equal(getSensitiveActionClass(req('GET', '/backups/files')), '');
    assert.equal(getSensitiveActionClass(req('GET', '/backups/alerts')), '');
    assert.equal(getSensitiveActionClass(req('GET', '/restore/jobs')), '');
    assert.equal(getSensitiveActionClass(req('GET', '/restore/drills')), '');
  });

  test('backup write endpoints require high-risk MFA step-up', () => {
    assert.equal(getSensitiveActionClass(req('POST', '/backups/full')), 'high_risk_config');
    assert.equal(getSensitiveActionClass(req('POST', '/restore/jobs')), 'high_risk_config');
    assert.equal(getSensitiveActionClass(req('POST', '/restore/jobs/job-1/approve')), 'high_risk_config');
    assert.equal(getSensitiveActionClass(req('POST', '/restore/jobs/job-1/switch')), 'high_risk_config');
  });
});
