const test = require('node:test');
const assert = require('node:assert/strict');

const servicePath = require.resolve('../src/modules/search/service/search.service');
const repoPath = require.resolve('../src/modules/search/repository/search.repository');
const analyticsPath = require.resolve('../src/modules/analytics');

function loadService(repoOverrides = {}) {
  delete require.cache[servicePath];
  delete require.cache[repoPath];
  delete require.cache[analyticsPath];

  const repo = {
    countSearchResults: async () => 0,
    upsertSearchTerm: async () => {},
    selectHotTerms: async () => [],
    selectSuggestions: async () => [],
    selectAdminSearchTerms: async () => ({ list: [], total: 0, page: 1, pageSize: 20, totalPages: 0 }),
    upsertManualSearchTerm: async (payload) => ({
      id: 1,
      keyword: payload.keyword,
      normalized_keyword: payload.normalizedKeyword,
      source: 'manual',
      search_count: 0,
      result_count: payload.resultCount,
      is_pinned: payload.isPinned ? 1 : 0,
      is_hidden: payload.isHidden ? 1 : 0,
      sort_order: payload.sortOrder,
      remark: payload.remark,
    }),
    updateSearchTerm: async () => null,
    deleteSearchTerm: async () => false,
    ...repoOverrides,
  };

  require.cache[repoPath] = { id: repoPath, filename: repoPath, loaded: true, exports: repo };
  require.cache[analyticsPath] = {
    id: analyticsPath,
    filename: analyticsPath,
    loaded: true,
    exports: {
      api: {
        trackEvent: async () => {},
      },
    },
  };

  return require(servicePath);
}

test('listHotTerms formats manual and hidden metadata for storefront use', async () => {
  const svc = loadService({
    selectHotTerms: async () => [
      {
        id: 9,
        keyword: '薄荷',
        source: 'manual',
        search_count: 0,
        result_count: 1,
        is_pinned: 1,
        is_hidden: 0,
        sort_order: 2,
        last_searched_at: null,
      },
    ],
  });

  const rows = await svc.listHotTerms({ limit: 10 });
  assert.deepEqual(rows[0], {
    id: '9',
    keyword: '薄荷',
    search_count: 0,
    result_count: 1,
    last_searched_at: null,
    source: 'manual',
    is_pinned: true,
    is_hidden: false,
    sort_order: 2,
    remark: '',
  });
});

test('trackSearch uses provided result_count and writes analytics event', async () => {
  const calls = [];
  delete require.cache[analyticsPath];
  require.cache[analyticsPath] = {
    id: analyticsPath,
    filename: analyticsPath,
    loaded: true,
    exports: {
      api: {
        trackEvent: async (payload) => calls.push(payload),
      },
    },
  };

  delete require.cache[servicePath];
  delete require.cache[repoPath];
  const repo = {
    countSearchResults: async () => {
      throw new Error('count should not be called when result_count is supplied');
    },
    upsertSearchTerm: async (payload) => calls.push({ upsert: payload }),
    selectHotTerms: async () => [],
    selectSuggestions: async () => [],
  };
  require.cache[repoPath] = { id: repoPath, filename: repoPath, loaded: true, exports: repo };
  const svc = require(servicePath);

  await svc.trackSearch({ keyword: '  薄荷  ', result_count: 3, session_id: 's1' }, {});

  assert.equal(calls[0].upsert.keyword, '薄荷');
  assert.equal(calls[0].upsert.resultCount, 3);
  assert.equal(calls[1].event_type, 'search');
  assert.equal(calls[1].amount, 3);
});

test('saveAdminSearchTerm normalizes manual term and defaults to pinned visible', async () => {
  const svc = loadService();
  const saved = await svc.saveAdminSearchTerm({
    keyword: '  冰薄荷  ',
    result_count: 8,
    is_pinned: true,
    is_hidden: false,
    sort_order: 5,
    remark: '首页推荐',
  });

  assert.equal(saved.keyword, '冰薄荷');
  assert.equal(saved.source, 'manual');
  assert.equal(saved.is_pinned, true);
  assert.equal(saved.is_hidden, false);
  assert.equal(saved.sort_order, 5);
  assert.equal(saved.result_count, 8);
});

test('update and delete admin search term return 404 style errors for missing rows', async () => {
  const svc = loadService();
  await assert.rejects(() => svc.updateAdminSearchTerm(404, { is_hidden: true }), { message: '热门搜索词不存在', status: 404 });
  await assert.rejects(() => svc.removeAdminSearchTerm(404), { message: '热门搜索词不存在', status: 404 });
});
