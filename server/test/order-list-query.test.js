const { test } = require('node:test');
const assert = require('node:assert/strict');
const repo = require('../src/modules/order/repository/order.repository');

test('buyer order keyword search stays user-scoped and parameterized', async () => {
  let captured = null;
  const q = {
    async query(sql, params) {
      captured = { sql, params };
      return [[{ total: 0 }], []];
    },
  };

  await repo.countOrdersForUser(q, {
    userId: 'user-1',
    tab: 'all',
    keyword: '签证%_!',
  });

  assert.ok(captured);
  assert.match(captured.sql, /WHERE o\.user_id = \?/);
  assert.match(captured.sql, /o\.buyer_deleted_at IS NULL/);
  assert.match(captured.sql, /o\.order_no LIKE \? ESCAPE '!'/);
  assert.match(captured.sql, /o\.contact_phone/);
  assert.match(captured.sql, /o\.tracking_no/);
  assert.match(captured.sql, /EXISTS \(\s*SELECT 1\s*FROM order_items oi/s);
  assert.match(captured.sql, /oi\.product_name_snapshot/);
  assert.match(captured.sql, /oi\.variant_name/);
  assert.match(captured.sql, /oi\.sku_code/);
  assert.doesNotMatch(captured.sql, /JOIN users/i);
  assert.equal(captured.params[0], 'user-1');
  assert.equal(captured.params.length, 13);
  assert.ok(captured.params.slice(1).every((param) => param === '%签证!%!_!!%'));
});
