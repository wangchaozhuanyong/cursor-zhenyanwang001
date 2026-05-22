/**
 * DB integration: soft-deleted products are hidden from admin reads and mutations.
 */
require('./setupTestEnv').requireTestDatabase();
require('./_dbCleanup.test');
const { test, describe, after } = require('node:test');
const assert = require('node:assert/strict');
const db = require('../src/config/db');
const repo = require('../src/modules/admin/repository/adminProduct.repository');
const svc = require('../src/modules/admin/service/adminProduct.service');
const { BusinessError } = require('../src/errors/BusinessError');
const { generateId } = require('../src/utils/helpers');

const mockReq = {};

async function insertTestProduct(id) {
  await repo.insertProduct({
    id,
    name: `soft-del-${id.slice(0, 8)}`,
    cover_image: '',
    video_url: '',
    imagesJson: '[]',
    price: 12.5,
    original_price: null,
    sales_count: 0,
    category_id: '',
    stock: 5,
    status: 'active',
    lifecycle_status: 1,
    sort_order: 0,
    description: 'soft-delete test',
    search_keywords: '',
    is_recommended: 0,
    is_new: 0,
    is_hot: 0,
  });
}

describe('admin product soft-delete guards', () => {
  let productId;

  after(async () => {
    if (!productId) return;
    await db.query('DELETE FROM products WHERE id = ?', [productId]).catch(() => {});
  });

  test('deleted product is hidden from select and service getById', async () => {
    productId = generateId();
    await insertTestProduct(productId);

    const active = await repo.selectProductById(productId);
    assert.ok(active, 'product should exist before delete');

    await repo.deleteProductById(productId, 'test-admin');

    assert.equal(await repo.selectProductById(productId), null);

    const trashed = await repo.selectProductById(productId, { includeDeleted: true });
    assert.ok(trashed?.deleted_at, 'includeDeleted should return soft-deleted row');

    await assert.rejects(
      () => svc.getProductById(productId),
      (err) => err instanceof BusinessError && err.statusCode === 404,
    );
  });

  test('update and batch-status skip soft-deleted products', async () => {
    productId = generateId();
    await insertTestProduct(productId);
    const beforeName = (await repo.selectProductById(productId)).name;

    await repo.deleteProductById(productId, 'test-admin');

    await repo.updateProductDynamic(['name = ?'], ['mutated-after-delete'], productId);

    const stillDeleted = await repo.selectProductById(productId, { includeDeleted: true });
    assert.equal(stillDeleted.name, beforeName, 'updateProductDynamic must not change deleted row');

    await repo.batchUpdateStatus([productId], 'inactive', 2);

    const afterBatch = await repo.selectProductById(productId, { includeDeleted: true });
    assert.equal(afterBatch.status, 'active');
    assert.equal(Number(afterBatch.lifecycle_status), 1);
  });

  test('deleteProduct returns 404 when product already deleted', async () => {
    productId = generateId();
    await insertTestProduct(productId);
    await repo.deleteProductById(productId, 'test-admin');

    await assert.rejects(
      () => svc.deleteProduct(productId, 'test-admin', mockReq),
      (err) => err instanceof BusinessError && err.statusCode === 404,
    );
  });

  test('batchUpdateStatus reports skipped deleted ids', async () => {
    productId = generateId();
    await insertTestProduct(productId);
    const activeId = generateId();
    await insertTestProduct(activeId);

    await repo.deleteProductById(productId, 'test-admin');

    const result = await svc.batchUpdateStatus([productId, activeId], 'inactive', 'test-admin', mockReq);
    assert.equal(result.data.updated, 1);
    assert.equal(result.data.skipped, 1);
    assert.ok(result.data.skipped_ids.includes(productId));

    await db.query('DELETE FROM products WHERE id = ?', [activeId]).catch(() => {});
  });

  test('CSV import skips updates to soft-deleted product id', async () => {
    productId = generateId();
    await insertTestProduct(productId);
    await repo.deleteProductById(productId, 'test-admin');

    const csv = `id,name,price,stock\n${productId},Renamed,19.9,3`;

    const result = await svc.importProductsCsv(csv, null, mockReq);
    assert.equal(result.data.updated, 0);
    assert.ok(result.data.skipped >= 1, 'deleted product row should be skipped');
    assert.ok(
      result.data.errors.some((e) => /商品已删除/.test(e.reason)),
      'import errors should mention deleted product',
    );

    const row = await repo.selectProductById(productId, { includeDeleted: true });
    assert.equal(row.name, `soft-del-${productId.slice(0, 8)}`, 'import must not rename deleted product');
  });
});
