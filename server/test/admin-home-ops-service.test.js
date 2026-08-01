const { test } = require('node:test');
const assert = require('node:assert/strict');

function loadHomeOpsService(overrides = {}) {
  const servicePath = require.resolve('../src/modules/admin/service/adminHomeOps.service');
  const repoPath = require.resolve('../src/modules/admin/repository/adminHomeOps.repository');
  const settingsPath = require.resolve('../src/modules/admin/homeModuleSettings');
  const supportPath = require.resolve('../src/modules/admin/homeNavSupportChannels');
  const capabilitiesPath = require.resolve('../src/modules/admin/service/adminSiteCapabilities.service');

  [servicePath, repoPath, settingsPath, supportPath, capabilitiesPath].forEach((path) => {
    delete require.cache[path];
  });

  const storedItems = [];
  const calls = [];
  const repo = {
    async selectNavItems() {
      return storedItems;
    },
    async selectNavTargetById() {
      return null;
    },
    async selectPublicCategoryIds(ids) {
      return ids;
    },
    async insertNavItem(item) {
      calls.push(['insertNavItem', item]);
      storedItems.push({
        id: item.id,
        icon_url: item.iconUrl,
        title: item.title,
        link_url: item.linkUrl,
        target_type: item.targetType,
        target_category_id: item.targetCategoryId,
        target_support_channel_id: item.targetSupportChannelId,
        sort_order: item.sortOrder,
        enabled: item.enabled ? 1 : 0,
      });
    },
    async updateNavItem(id, fields, values) {
      calls.push(['updateNavItem', id, fields, values]);
    },
    async deleteNavItem() {},
    async batchUpdateNavSort() {},
    ...overrides.repo,
  };
  const settings = {
    async getHomeModuleSettings() {
      return { featuredEnabled: true };
    },
    async saveHomeModuleSettings() {
      return {};
    },
    ...overrides.settings,
  };
  const support = {
    async findSupportChannel() {
      return null;
    },
    async listSupportChannels() {
      return [];
    },
    buildSupportNavLinkUrl(id) {
      return `/support-download?channelId=${encodeURIComponent(id)}`;
    },
    ...overrides.support,
  };
  const capabilities = {
    async getSiteCapabilities() {
      return { customerServiceDownloadEnabled: true };
    },
    ...overrides.capabilities,
  };

  require.cache[repoPath] = { id: repoPath, filename: repoPath, loaded: true, exports: repo };
  require.cache[settingsPath] = { id: settingsPath, filename: settingsPath, loaded: true, exports: settings };
  require.cache[supportPath] = { id: supportPath, filename: supportPath, loaded: true, exports: support };
  require.cache[capabilitiesPath] = {
    id: capabilitiesPath,
    filename: capabilitiesPath,
    loaded: true,
    exports: capabilities,
  };

  return { service: require(servicePath), calls, storedItems };
}

test('home nav rejects a missing, disabled, or hidden category target', async () => {
  const { service, calls } = loadHomeOpsService({
    repo: {
      async selectPublicCategoryIds() {
        return [];
      },
    },
  });

  const result = await service.createNavItem({
    title: '失效分类',
    target_type: 'category',
    target_category_id: 'category-hidden',
  });

  assert.deepEqual(result, {
    error: { code: 400, message: '所选分类不存在、已停用或不可见' },
  });
  assert.equal(calls.length, 0);
});

test('home nav stores a visible category as a canonical category route', async () => {
  const { service, calls } = loadHomeOpsService();

  const result = await service.createNavItem({
    title: '食品饮料',
    target_type: 'category',
    target_category_id: 'category-food',
  });

  assert.equal(result.data.target_type, 'category');
  assert.equal(result.data.target_category_id, 'category-food');
  assert.equal(result.data.link_url, '/categories?cat=category-food');
  assert.equal(calls[0][0], 'insertNavItem');
});

test('home nav rejects empty and unsafe custom targets', async () => {
  for (const linkUrl of ['', 'javascript:alert(1)', '//example.com/path']) {
    const { service, calls } = loadHomeOpsService();
    const result = await service.createNavItem({
      title: '无效入口',
      target_type: 'url',
      link_url: linkUrl,
    });

    assert.equal(result.error?.code, 400);
    assert.equal(calls.length, 0);
  }
});

test('home nav cannot re-enable an existing stale category target', async () => {
  const { service, calls } = loadHomeOpsService({
    repo: {
      async selectNavTargetById() {
        return {
          target_type: 'category',
          target_category_id: 'cat-stale',
          target_support_channel_id: null,
          link_url: '/categories?cat=cat-stale',
        };
      },
      async selectPublicCategoryIds() {
        return [];
      },
    },
  });

  const result = await service.updateNavItem('nav-stale', { enabled: true });

  assert.deepEqual(result, {
    error: { code: 400, message: '所选分类不存在、已停用或不可见' },
  });
  assert.equal(calls.length, 0);
});

test('public home ops hides stale category, URL, and support targets', async () => {
  const rows = [
    {
      id: 'category-valid',
      title: '有效分类',
      target_type: 'category',
      target_category_id: 'cat-valid',
      enabled: 1,
      sort_order: 1,
    },
    {
      id: 'category-stale',
      title: '失效分类',
      target_type: 'category',
      target_category_id: 'cat-stale',
      enabled: 1,
      sort_order: 2,
    },
    {
      id: 'all-categories',
      title: '全部分类',
      target_type: 'categories',
      enabled: 1,
      sort_order: 3,
    },
    {
      id: 'url-valid',
      title: '邀请好友',
      target_type: 'url',
      link_url: '/invite',
      enabled: 1,
      sort_order: 4,
    },
    {
      id: 'url-empty',
      title: '空链接',
      target_type: 'url',
      link_url: '',
      enabled: 1,
      sort_order: 5,
    },
    {
      id: 'support-valid',
      title: '客服',
      target_type: 'support',
      target_support_channel_id: 'whatsapp-main',
      enabled: 1,
      sort_order: 6,
    },
    {
      id: 'support-stale',
      title: '旧客服',
      target_type: 'support',
      target_support_channel_id: 'wechat-old',
      enabled: 1,
      sort_order: 7,
    },
  ];
  const { service } = loadHomeOpsService({
    repo: {
      async selectNavItems() {
        return rows;
      },
      async selectPublicCategoryIds(ids) {
        return ids.filter((id) => id === 'cat-valid');
      },
    },
    support: {
      async listSupportChannels() {
        return [{ id: 'whatsapp-main', enabled: true }];
      },
    },
  });

  const result = await service.getPublicHomeOps();

  assert.deepEqual(
    result.navItems.map((item) => item.id),
    ['category-valid', 'all-categories', 'url-valid', 'support-valid'],
  );
  assert.deepEqual(result.moduleSettings, { featuredEnabled: true });
});

test('public home ops hides support targets when the capability is disabled', async () => {
  const { service } = loadHomeOpsService({
    repo: {
      async selectNavItems() {
        return [{
          id: 'support-target',
          title: '客服',
          target_type: 'support',
          target_support_channel_id: 'whatsapp-main',
          enabled: 1,
          sort_order: 1,
        }];
      },
    },
    support: {
      async listSupportChannels() {
        return [{ id: 'whatsapp-main', enabled: true }];
      },
    },
    capabilities: {
      async getSiteCapabilities() {
        return { customerServiceDownloadEnabled: false };
      },
    },
  });

  const result = await service.getPublicHomeOps();

  assert.deepEqual(result.navItems, []);
});
