const { afterEach, test } = require('node:test');
const assert = require('node:assert/strict');

const homeModuleSettingsPath = require.resolve('../src/modules/admin/homeModuleSettings');
const siteSettingsRepoPath = require.resolve('../src/modules/admin/repository/adminSiteSettings.repository');
const productModulePath = require.resolve('../src/modules/product');
const homeModulePath = require.resolve('../src/modules/home');
const auditLogPath = require.resolve('../src/utils/auditLog');

function clearHomeModuleSettingsCache() {
  for (const path of [
    homeModuleSettingsPath,
    siteSettingsRepoPath,
    productModulePath,
    homeModulePath,
    auditLogPath,
  ]) {
    delete require.cache[path];
  }
}

function loadHomeModuleSettingsWithMocks(initialRaw = null) {
  clearHomeModuleSettingsCache();
  let stored = initialRaw;
  let homeInvalidated = 0;
  let catalogCleared = 0;

  require.cache[siteSettingsRepoPath] = {
    id: siteSettingsRepoPath,
    filename: siteSettingsRepoPath,
    loaded: true,
    exports: {
      async selectSettingValue() {
        return stored;
      },
      async upsertSetting(_key, value) {
        stored = value;
      },
    },
  };

  require.cache[homeModulePath] = {
    id: homeModulePath,
    filename: homeModulePath,
    loaded: true,
    exports: {
      api: {
        invalidateHomeBootstrapCache() {
          homeInvalidated += 1;
        },
      },
    },
  };

  require.cache[productModulePath] = {
    id: productModulePath,
    filename: productModulePath,
    loaded: true,
    exports: {
      api: {
        clearCatalogCache() {
          catalogCleared += 1;
        },
      },
    },
  };

  require.cache[auditLogPath] = {
    id: auditLogPath,
    filename: auditLogPath,
    loaded: true,
    exports: {
      async writeAuditLog() {},
    },
  };

  return {
    module: require(homeModuleSettingsPath),
    getStored: () => stored,
    getHomeInvalidated: () => homeInvalidated,
    getCatalogCleared: () => catalogCleared,
  };
}

afterEach(() => {
  clearHomeModuleSettingsCache();
});

test('parseSettings reads valid custom home module titles only', () => {
  const { module: homeModuleSettings } = loadHomeModuleSettingsWithMocks();
  const settings = homeModuleSettings.parseSettings({
    titles: {
      hot_sales: '  热门推荐  ',
      recommend: 123,
      unknown_module: 'ignore me',
    },
  });

  assert.deepEqual(settings.titles, {
    hot_sales: '热门推荐',
  });
});

test('saveHomeModuleSettings persists and clears custom titles', async () => {
  const { module: homeModuleSettings, getStored, getHomeInvalidated, getCatalogCleared } =
    loadHomeModuleSettingsWithMocks(JSON.stringify({
      modules: { hot_sales: false },
      titles: {
        hot_sales: '旧热销标题',
        recommend: '旧推荐标题',
      },
      hotBatchSize: 6,
    }));

  const saved = await homeModuleSettings.saveHomeModuleSettings({
    titles: {
      hot_sales: ' 新热销标题 ',
      recommend: '',
      unknown_module: 'ignore me',
    },
  }, 'admin-1', {});

  assert.equal(saved.modules.hot_sales, false);
  assert.deepEqual(saved.titles, {
    hot_sales: '新热销标题',
  });

  const stored = JSON.parse(getStored());
  assert.deepEqual(stored.titles, {
    hot_sales: '新热销标题',
  });
  assert.equal(stored.hotBatchSize, 6);
  assert.equal(getHomeInvalidated(), 1);
  assert.equal(getCatalogCleared(), 1);
});
