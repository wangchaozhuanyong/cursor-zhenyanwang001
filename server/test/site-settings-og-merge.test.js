const { describe, test, afterEach } = require('node:test');
const assert = require('node:assert/strict');

function resetModule(modulePath) {
  try {
    delete require.cache[require.resolve(modulePath)];
  } catch {
    // Module may not have been loaded yet.
  }
}

function loadContentServiceWithRows(rows) {
  const servicePath = '../src/modules/product/service/content.service';
  const repoPath = '../src/modules/product/repository/content.repository';
  resetModule(servicePath);
  resetModule(repoPath);

  const resolvedRepoPath = require.resolve(repoPath);
  const state = { requestedKeys: [] };
  require.cache[resolvedRepoPath] = {
    id: resolvedRepoPath,
    filename: resolvedRepoPath,
    loaded: true,
    exports: {
      getSiteSettingsByKeys: async (keys) => {
        state.requestedKeys = keys;
        return [rows];
      },
    },
  };

  return {
    service: require(servicePath),
    state,
  };
}

function loadAdminSiteSettingsService({ rows = [] } = {}) {
  const servicePath = '../src/modules/admin/service/adminSiteSettings.service';
  const repoPath = '../src/modules/admin/repository/adminSiteSettings.repository';
  const auditPath = '../src/utils/auditLog';
  resetModule(servicePath);
  resetModule(repoPath);
  resetModule(auditPath);

  const upserts = [];
  const resolvedRepoPath = require.resolve(repoPath);
  require.cache[resolvedRepoPath] = {
    id: resolvedRepoPath,
    filename: resolvedRepoPath,
    loaded: true,
    exports: {
      selectNonShippingSettingsRows: async () => rows,
      upsertSetting: async (key, value) => {
        upserts.push([key, value]);
      },
    },
  };

  const resolvedAuditPath = require.resolve(auditPath);
  require.cache[resolvedAuditPath] = {
    id: resolvedAuditPath,
    filename: resolvedAuditPath,
    loaded: true,
    exports: {
      writeAuditLog: async () => {},
    },
  };

  return {
    service: require(servicePath),
    upserts,
  };
}

afterEach(() => {
  resetModule('../src/modules/product/service/content.service');
  resetModule('../src/modules/product/repository/content.repository');
  resetModule('../src/modules/admin/service/adminSiteSettings.service');
  resetModule('../src/modules/admin/repository/adminSiteSettings.repository');
  resetModule('../src/utils/auditLog');
});

describe('merged OG image site setting', () => {
  test('public site info maps legacy defaultOgImageUrl into ogImageUrl and hides the legacy field', async () => {
    const { service, state } = loadContentServiceWithRows([
      { setting_key: 'siteName', setting_value: '官方商城' },
      { setting_key: 'defaultOgImageUrl', setting_value: 'https://example.test/legacy-og.jpg' },
    ]);

    const info = await service.getPublicSiteInfo();

    assert.equal(info.ogImageUrl, 'https://example.test/legacy-og.jpg');
    assert.equal(Object.prototype.hasOwnProperty.call(info, 'defaultOgImageUrl'), false);
    assert.equal(state.requestedKeys.includes('ogImageUrl'), true);
    assert.equal(state.requestedKeys.includes('defaultOgImageUrl'), true);
  });

  test('admin settings read prefers ogImageUrl and hides defaultOgImageUrl', async () => {
    const { service } = loadAdminSiteSettingsService({
      rows: [
        { setting_key: 'ogImageUrl', setting_value: 'https://example.test/main-og.jpg', version: 3 },
        { setting_key: 'defaultOgImageUrl', setting_value: 'https://example.test/legacy-og.jpg', version: 2 },
      ],
    });

    const res = await service.getSiteSettings();

    assert.equal(res.data.ogImageUrl, 'https://example.test/main-og.jpg');
    assert.equal(Object.prototype.hasOwnProperty.call(res.data, 'defaultOgImageUrl'), false);
  });

  test('admin settings save writes ogImageUrl and mirrors it to the legacy key for compatibility', async () => {
    const { service, upserts } = loadAdminSiteSettingsService({
      rows: [{ setting_key: 'siteName', setting_value: '官方商城', version: 1 }],
    });

    await service.updateSiteSettings({ version: 1, ogImageUrl: '' }, 'admin-1', {});

    assert.deepEqual(upserts, [
      ['ogImageUrl', ''],
      ['defaultOgImageUrl', ''],
    ]);
  });
});
