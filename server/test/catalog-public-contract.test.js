const { test } = require('node:test');
const assert = require('node:assert/strict');

const INTERNAL_PRODUCT_FIELDS = [
  'stock_warning_threshold',
  'stock_lower_limit',
  'stock_upper_limit',
];
const INTERNAL_VARIANT_FIELDS = [
  'cost_price',
  'barcode',
  'stock_warning_threshold',
  'stock_lower_limit',
  'stock_upper_limit',
];

function productRow(id = 'product-1') {
  return {
    id,
    name: 'Public product',
    cover_image: '',
    cover_image_alt: '',
    video_url: '',
    images: '[]',
    image_alt_json: '[]',
    price: 30,
    original_price: 40,
    sales_count: 2,
    points: 0,
    category_id: 'category-1',
    category_name: '正品烟草',
    stock: 8,
    stock_warning_threshold: 5,
    stock_lower_limit: 3,
    stock_upper_limit: 20,
    lifecycle_status: 1,
    status: 'active',
    sort_order: 0,
    created_at: '2026-07-29T00:00:00.000Z',
    published_at: '2026-07-29T00:00:00.000Z',
    description: '',
    is_recommended: 0,
    is_new: 0,
    is_hot: 1,
  };
}

function variantRow(productId = 'product-1') {
  return {
    id: 'variant-1',
    product_id: productId,
    sku_code: 'PUBLIC-SKU',
    title: 'Default',
    price: 30,
    original_price: 40,
    cost_price: 9,
    stock: 8,
    stock_warning_threshold: 5,
    stock_lower_limit: 3,
    stock_upper_limit: 20,
    barcode: 'SECRET-BARCODE',
    image_url: '',
    weight: 1,
    enabled: 1,
    sort_order: 0,
    is_default: 1,
  };
}

function loadCatalogService(t) {
  const servicePath = require.resolve('../src/modules/product/service/catalog.service');
  const repoPath = require.resolve('../src/modules/product/repository/catalog.repository');
  const tagRepoPath = require.resolve('../src/modules/product/repository/productTagAssignment.repository');
  const activityRepoPath = require.resolve('../src/modules/product/repository/activity.repository');
  const homeModuleSettingsPath = require.resolve('../src/modules/admin/homeModuleSettings');
  const modulePaths = [
    servicePath,
    repoPath,
    tagRepoPath,
    activityRepoPath,
    homeModuleSettingsPath,
  ];
  for (const modulePath of modulePaths) delete require.cache[modulePath];

  const product = productRow();
  const variant = variantRow(product.id);
  require.cache[repoPath] = {
    id: repoPath,
    filename: repoPath,
    loaded: true,
    exports: {
      async selectProductById() {
        return product;
      },
      async selectProductVariants() {
        return [variant];
      },
      async selectProductSpecGroups() {
        return [];
      },
      async selectVariantSpecValues() {
        return new Map();
      },
      async selectDefaultVariantsByProductIds() {
        return [variant];
      },
      async selectVariantPriceRangesByProductIds() {
        return [{
          product_id: product.id,
          min_price: 30,
          max_price: 30,
          min_original_price: 40,
          max_original_price: 40,
          variant_count: 1,
        }];
      },
      async selectSiteSettingValues() {
        return { newArrivalDisplayCount: '1', newArrivalOnlyInStock: '1' };
      },
      async selectActiveProductsByFlag(flag) {
        return flag === 'is_hot' ? [product] : [];
      },
      async selectActiveProductsFallback() {
        return [product];
      },
      async selectActiveProductsRecent() {
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
        return { hotBatchSize: 1, recBatchSize: 1, guestRecommendMax: 1 };
      },
    },
  };

  t.after(() => {
    for (const modulePath of modulePaths) delete require.cache[modulePath];
  });

  return require(servicePath);
}

function assertInternalFieldsHidden(value, fields) {
  for (const field of fields) {
    assert.equal(Object.hasOwn(value, field), false, `${field} must not be public`);
  }
}

test('public product detail omits inventory controls and variant commercial fields', async (t) => {
  const service = loadCatalogService(t);

  const result = await service.getProductById('product-1');

  assertInternalFieldsHidden(result, INTERNAL_PRODUCT_FIELDS);
  assert.equal(result.category_name, '正品烟草');
  assert.equal(result.variants.length, 1);
  assertInternalFieldsHidden(result.variants[0], INTERNAL_VARIANT_FIELDS);
  assert.equal(result.variants[0].price, 30);
  assert.equal(result.variants[0].stock, 8);
});

test('home product default variant omits internal commercial fields', async (t) => {
  const service = loadCatalogService(t);

  const result = await service.getHomeProducts();
  const defaultVariant = result.hot[0].default_variant;

  assert.ok(defaultVariant);
  assertInternalFieldsHidden(defaultVariant, INTERNAL_VARIANT_FIELDS);
  assert.equal(defaultVariant.price, 30);
  assert.equal(defaultVariant.stock, 8);
});
