const { test } = require('node:test');
const assert = require('node:assert/strict');

function product(id, patch = {}) {
  return {
    id,
    name: id,
    cover_image: '',
    cover_image_alt: '',
    video_url: '',
    images: '[]',
    image_alt_json: '[]',
    price: 10,
    original_price: null,
    sales_count: 0,
    points: 0,
    category_id: 'cat-1',
    stock: 10,
    stock_warning_threshold: 5,
    lifecycle_status: 1,
    status: 'active',
    sort_order: 0,
    created_at: '2026-06-05T00:00:00.000Z',
    published_at: '2026-06-05T00:00:00.000Z',
    description: '',
    is_recommended: 0,
    is_new: 0,
    is_hot: 0,
    ...patch,
  };
}

function loadCatalogServiceWithHomeProductMocks(t, options = {}) {
  const servicePath = require.resolve('../src/modules/product/service/catalog.service');
  const repoPath = require.resolve('../src/modules/product/repository/catalog.repository');
  const tagRepoPath = require.resolve('../src/modules/product/repository/productTagAssignment.repository');
  const activityRepoPath = require.resolve('../src/modules/product/repository/activity.repository');
  const homeModuleSettingsPath = require.resolve('../src/modules/admin/homeModuleSettings');

  for (const path of [servicePath, repoPath, tagRepoPath, activityRepoPath, homeModuleSettingsPath]) {
    delete require.cache[path];
  }

  const newHotA = product('new-hot-a', { is_new: 1, is_hot: 1, sort_order: 1 });
  const newHotB = product('new-hot-b', { is_new: 1, is_hot: 1, sort_order: 2 });
  const fallbackA = product('fallback-a', { sort_order: 3 });
  const fallbackB = product('fallback-b', { sort_order: 4 });
  const hotRows = options.hotRows || [newHotA, newHotB];
  const newRows = options.newRows || [newHotA, newHotB];
  const recommendedRows = options.recommendedRows || [];
  const fallbackRows = options.fallbackRows || [newHotA, newHotB, fallbackA, fallbackB];
  const recentRows = options.recentRows || [newHotA, newHotB];
  const homeSettings = options.homeSettings || { hotBatchSize: 4, recBatchSize: 4, guestRecommendMax: 8 };

  require.cache[repoPath] = {
    id: repoPath,
    filename: repoPath,
    loaded: true,
    exports: {
      async selectSiteSettingValues() {
        return options.siteSettings || { newArrivalDisplayCount: '8', newArrivalOnlyInStock: '1' };
      },
      async selectActiveProductsByFlag(flagField) {
        if (flagField === 'is_hot') return hotRows;
        if (flagField === 'is_new') return newRows;
        if (flagField === 'is_recommended') return recommendedRows;
        return [];
      },
      async selectActiveProductsFallback() {
        return fallbackRows;
      },
      async selectActiveProductsRecent() {
        return recentRows;
      },
      async selectDefaultVariantsByProductIds() {
        return [];
      },
    },
  };

  require.cache[tagRepoPath] = {
    id: tagRepoPath,
    filename: tagRepoPath,
    loaded: true,
    exports: {
      async selectTagsByProductIds() {
        return new Map();
      },
    },
  };

  require.cache[activityRepoPath] = {
    id: activityRepoPath,
    filename: activityRepoPath,
    loaded: true,
    exports: {
      async selectActiveActivitiesByProductIds() {
        return new Map();
      },
    },
  };

  require.cache[homeModuleSettingsPath] = {
    id: homeModuleSettingsPath,
    filename: homeModuleSettingsPath,
    loaded: true,
    exports: {
      async getHomeModuleSettings() {
        return homeSettings;
      },
    },
  };

  t.after(() => {
    for (const path of [servicePath, repoPath, tagRepoPath, activityRepoPath, homeModuleSettingsPath]) {
      delete require.cache[path];
    }
  });

  return require(servicePath);
}

test('home products keep new arrivals when hot fallback already used the same products', async (t) => {
  const service = loadCatalogServiceWithHomeProductMocks(t);

  const result = await service.getHomeProducts();

  assert.deepEqual(result.hot.map((item) => item.id), [
    'new-hot-a',
    'new-hot-b',
    'fallback-a',
    'fallback-b',
  ]);
  assert.deepEqual(result.new_arrivals.map((item) => item.id), [
    'new-hot-a',
    'new-hot-b',
  ]);
});

test('home products avoid repeated recommended items when unique candidates can fill batches', async (t) => {
  const hotRows = Array.from({ length: 8 }, (_, index) => product(`hot-${index + 1}`, { is_hot: 1 }));
  const recommendFallback = Array.from({ length: 8 }, (_, index) => product(`rec-${index + 1}`, { is_recommended: 1 }));
  const service = loadCatalogServiceWithHomeProductMocks(t, {
    hotRows,
    newRows: [],
    recommendedRows: [],
    fallbackRows: [...hotRows, ...recommendFallback],
    recentRows: [],
    homeSettings: { hotBatchSize: 4, recBatchSize: 4, guestRecommendMax: 8 },
  });

  const result = await service.getHomeProducts();

  assert.deepEqual(result.hot.map((item) => item.id), hotRows.map((item) => item.id));
  assert.deepEqual(result.recommended.map((item) => item.id), recommendFallback.map((item) => item.id));
});

test('home products backfill recommended items when unique candidates are not enough', async (t) => {
  const hotRows = Array.from({ length: 8 }, (_, index) => product(`hot-${index + 1}`, { is_hot: 1 }));
  const service = loadCatalogServiceWithHomeProductMocks(t, {
    hotRows,
    newRows: [],
    recommendedRows: [],
    fallbackRows: hotRows,
    recentRows: [],
    homeSettings: { hotBatchSize: 4, recBatchSize: 4, guestRecommendMax: 8 },
  });

  const result = await service.getHomeProducts();

  assert.deepEqual(result.recommended.map((item) => item.id), hotRows.map((item) => item.id));
});
