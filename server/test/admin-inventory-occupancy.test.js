const { afterEach, test } = require('node:test');
const assert = require('node:assert/strict');

const servicePath = require.resolve('../src/modules/admin/service/adminInventory.service');
const repoPath = require.resolve('../src/modules/admin/repository/adminInventory.repository');

function clearInventoryServiceCache() {
  for (const path of [servicePath, repoPath]) {
    delete require.cache[path];
  }
}

function loadInventoryServiceWithRepo(repoOverrides = {}) {
  clearInventoryServiceCache();
  require.cache[repoPath] = {
    id: repoPath,
    filename: repoPath,
    loaded: true,
    exports: {
      async selectInventorySummary() {
        return {};
      },
      async countSkus() {
        return 0;
      },
      async selectSkusPage() {
        return [];
      },
      ...repoOverrides,
    },
  };
  return require(servicePath);
}

afterEach(() => {
  clearInventoryServiceCache();
});

test('inventory summary exposes reserved and pending order locked stock', async () => {
  const service = loadInventoryServiceWithRepo({
    async selectInventorySummary() {
      return {
        total_products: 3,
        total_skus: 5,
        total_stock: 120,
        total_reserved_stock: 7,
        total_available_stock: 113,
        pending_order_locked_stock: 11,
        pending_order_count: 4,
        low_stock_skus: 1,
        out_of_stock_skus: 0,
        today_in_qty: 20,
        today_out_qty: 3,
        today_order_deduct_qty: 9,
      };
    },
  });

  const result = await service.getSummary();

  assert.equal(result.data.total_reserved_stock, 7);
  assert.equal(result.data.total_available_stock, 113);
  assert.equal(result.data.pending_order_locked_stock, 11);
  assert.equal(result.data.pending_order_count, 4);
  assert.equal(result.data.locked_stock, 18);
});

test('inventory sku list returns pending order occupancy fields', async () => {
  const service = loadInventoryServiceWithRepo({
    async countSkus() {
      return 1;
    },
    async selectSkusPage() {
      return [{
        product_id: 'product-1',
        product_name: '测试商品',
        cover_image: '',
        category_name: '测试分类',
        lifecycle_status: 1,
        variant_id: 'variant-1',
        variant_title: '',
        spec_text: '默认规格',
        sku_code: 'SKU-1',
        barcode: '',
        price: 99,
        cost_price: 60,
        enabled: 1,
        stock: 30,
        unit_name: '件',
        reserved_stock: 3,
        pending_order_locked_stock: 5,
        pending_order_count: 2,
        locked_stock: 8,
        available_stock: 27,
        stock_warning_threshold: 6,
        low_stock: 0,
        out_of_stock: 0,
        updated_at: '2026-06-15 10:00:00',
      }];
    },
  });

  const result = await service.listSkus({ page: 1, pageSize: 20 });

  assert.equal(result.total, 1);
  assert.equal(result.list[0].reserved_stock, 3);
  assert.equal(result.list[0].pending_order_locked_stock, 5);
  assert.equal(result.list[0].pending_order_count, 2);
  assert.equal(result.list[0].locked_stock, 8);
  assert.equal(result.list[0].available_stock, 27);
});
