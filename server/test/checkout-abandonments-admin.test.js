const { describe, it, test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const {
  buildAdminWhere,
  buildItemsPreview,
  mapAdminCheckoutAbandonmentRow,
  checkoutIdSuffix,
  listAdminCheckoutAbandonments,
  OPEN_STATUSES,
} = require('../src/modules/order/service/checkoutAbandonment.service');

describe('checkout abandonments admin (unit)', () => {
  it('buildItemsPreview shows first two items and total count when more than two lines', () => {
    const preview = buildItemsPreview(
      [
        { name: '商品A', qty: 1 },
        { name: '商品B', qty: 2 },
        { name: '商品C', qty: 1 },
      ],
      5,
    );
    assert.equal(preview, '商品A x1，商品B x2，等 5 件');
  });

  it('mapAdminCheckoutAbandonmentRow sets display fields for orders and checkouts', () => {
    const orderRow = mapAdminCheckoutAbandonmentRow({
      id: 'snap-1',
      group_key: 'order:ord-1',
      order_id: 'ord-1',
      order_no: 'NO1001',
      status: 'ordered',
      snapshot_count: 2,
      items_summary: [{ name: 'Tea', qty: 1 }],
      items_count: 1,
      contact_name: 'Lee',
      contact_phone_masked: '138****0000',
      raw_amount: 0,
      discount_amount: 0,
      shipping_fee: 0,
      total_amount: 12,
      payment_method: 'online',
      created_at: '2026-01-01',
      updated_at: '2026-01-02',
    });
    assert.equal(orderRow.display_id, 'NO1001');
    assert.equal(orderRow.display_type, 'order');
    assert.equal(orderRow.action_type, 'view_order');
    assert.equal(orderRow.snapshot_count, 2);
    assert.equal(orderRow.has_duplicates, true);

    const checkoutRow = mapAdminCheckoutAbandonmentRow({
      id: 'abcdef12-3456-7890-abcd-ef1234567890',
      group_key: 'checkout:abcdef12-3456-7890-abcd-ef1234567890',
      order_id: null,
      order_no: '',
      status: 'open',
      snapshot_count: 1,
      items_summary: [],
      items_count: 0,
      contact_name: '',
      contact_phone_masked: '',
      raw_amount: 0,
      discount_amount: 0,
      shipping_fee: 0,
      total_amount: 0,
      payment_method: '',
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    });
    assert.equal(checkoutRow.display_type, 'checkout');
    assert.equal(checkoutRow.display_id, checkoutIdSuffix(checkoutRow.id));
    assert.equal(checkoutRow.has_duplicates, false);
  });

  it('buildAdminWhere defaults to open and ordered statuses', () => {
    const { where, params } = buildAdminWhere({});
    assert.match(where, /ca\.status IN/);
    assert.deepEqual(params.slice(0, OPEN_STATUSES.length), OPEN_STATUSES);
  });

  it('buildAdminWhere keyword includes phone, order id and items summary', () => {
    const { where, params } = buildAdminWhere({ keyword: '抹茶' });
    assert.match(where, /contact_phone_masked/);
    assert.match(where, /order_id/);
    assert.match(where, /items_summary/);
    assert.equal(params.filter((p) => String(p).includes('抹茶')).length, 6);
  });
});

describe('checkout abandonments admin (db)', () => {
  let db;
  let generateId;
  const ids = [];
  let migrationReady = false;

  try {
    require('./setupTestEnv').requireTestDatabase();
    db = require('../src/config/db');
    ({ generateId } = require('../src/utils/helpers'));
  } catch (err) {
    it('skips when test database is not configured', () => {
      assert.ok(err.message.includes('DB integration tests') || err.message.includes('Refusing'));
    });
    return;
  }

  const { runPendingMigrations } = require('../src/db/migrateRunner');

  before(async () => {
    try {
      await runPendingMigrations();
      migrationReady = true;
    } catch {
      migrationReady = false;
    }
  });

  async function insertRow(overrides = {}) {
    const id = overrides.id || generateId();
    ids.push(id);
    const userId = overrides.user_id || generateId();
    const itemsSummary = JSON.stringify(overrides.items_summary || [{ name: overrides.itemName || '测试商品', qty: 1, product_id: 'p1' }]);
    await db.query(
      `INSERT INTO checkout_abandonments
         (id, user_id, status, order_id, order_no, items_count, items_summary,
          raw_amount, discount_amount, shipping_fee, total_amount,
          payment_method, contact_name, contact_phone_masked, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 0, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        userId,
        overrides.status || 'ordered',
        overrides.order_id ?? null,
        overrides.order_no || '',
        overrides.items_count ?? 1,
        itemsSummary,
        overrides.total_amount ?? 10,
        overrides.payment_method || 'online',
        overrides.contact_name || '测试联系人',
        overrides.contact_phone_masked || '138****0000',
        overrides.created_at || new Date(),
        overrides.updated_at || new Date(),
      ],
    );
    return id;
  }

  after(async () => {
    if (!ids.length) return;
    await db.query(`DELETE FROM checkout_abandonments WHERE id IN (${ids.map(() => '?').join(',')})`, ids).catch(() => {});
  });

  test('deduplicates rows with the same order_id', { skip: () => !migrationReady }, async () => {
    const orderId = `test-order-${generateId()}`;
    const older = new Date('2026-01-01T10:00:00');
    const newer = new Date('2026-01-02T10:00:00');
    await insertRow({ order_id: orderId, order_no: 'DEDUP-001', updated_at: older, created_at: older });
    await insertRow({ order_id: orderId, order_no: 'DEDUP-001', updated_at: newer, created_at: newer });

    const result = await listAdminCheckoutAbandonments({ page: 1, pageSize: 50, keyword: 'DEDUP-001' });
    const matched = result.list.filter((row) => row.order_id === orderId);
    assert.equal(matched.length, 1);
    assert.equal(matched[0].snapshot_count, 2);
    assert.equal(matched[0].has_duplicates, true);
    assert.equal(result.total, 1);
  });

  test('keeps separate open snapshots without order_id', { skip: () => !migrationReady }, async () => {
    const marker = `OPEN-${generateId().slice(0, 8)}`;
    await insertRow({ status: 'open', order_id: null, contact_name: marker, itemName: `${marker}-A` });
    await insertRow({ status: 'open', order_id: null, contact_name: marker, itemName: `${marker}-B` });

    const result = await listAdminCheckoutAbandonments({ page: 1, pageSize: 50, keyword: marker });
    assert.equal(result.list.length, 2);
    assert.equal(result.total, 2);
  });

  test('excludes paid and closed by default', { skip: () => !migrationReady }, async () => {
    const marker = `STATUS-${generateId().slice(0, 8)}`;
    await insertRow({ status: 'paid', contact_name: marker });
    await insertRow({ status: 'closed', contact_name: marker });
    await insertRow({ status: 'open', contact_name: marker });

    const result = await listAdminCheckoutAbandonments({ page: 1, pageSize: 50, keyword: marker });
    assert.equal(result.list.length, 1);
    assert.equal(result.list[0].status, 'open');
  });

  test('shows paid rows when status filter is paid', { skip: () => !migrationReady }, async () => {
    const marker = `PAID-${generateId().slice(0, 8)}`;
    await insertRow({ status: 'paid', contact_name: marker, order_no: `PN-${marker}` });

    const result = await listAdminCheckoutAbandonments({ page: 1, pageSize: 50, status: 'paid', keyword: marker });
    assert.equal(result.list.length, 1);
    assert.equal(result.list[0].status, 'paid');
  });

  test('keyword matches order no, contact, phone and product name', { skip: () => !migrationReady }, async () => {
    const orderNo = `KW-${generateId().slice(0, 6)}`;
    await insertRow({
      status: 'ordered',
      order_id: generateId(),
      order_no: orderNo,
      contact_name: '张三',
      contact_phone_masked: '199****8888',
      items_summary: [{ name: '特级抹茶', qty: 2, product_id: 'p-match' }],
      items_count: 2,
    });

    for (const keyword of [orderNo, '张三', '199', '抹茶']) {
      const result = await listAdminCheckoutAbandonments({ page: 1, pageSize: 20, keyword });
      assert.ok(result.list.some((row) => row.order_no === orderNo), `keyword "${keyword}" should match`);
    }
  });
});
