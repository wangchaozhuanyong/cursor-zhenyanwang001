const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  adminUpdateOrderStatusBodySchema,
  adminShipOrderBodySchema,
  adminBatchShipBodySchema,
} = require('../src/modules/admin/schemas/adminOrder.schemas');

describe('admin order schemas', () => {
  it('accepts valid status update', () => {
    const result = adminUpdateOrderStatusBodySchema.safeParse({
      status: 'paid',
      remark: 'manual confirm',
    });
    assert.equal(result.success, true);
  });

  it('rejects invalid status update', () => {
    const result = adminUpdateOrderStatusBodySchema.safeParse({ status: 'invalid' });
    assert.equal(result.success, false);
  });

  it('accepts ship body with tracking_no alias', () => {
    const result = adminShipOrderBodySchema.safeParse({
      tracking_no: 'MY123',
      carrier: 'J&T',
    });
    assert.equal(result.success, true);
  });

  it('rejects empty batch ship payload', () => {
    const result = adminBatchShipBodySchema.safeParse({ order_ids: [], carrier: 'J&T' });
    assert.equal(result.success, false);
  });

  it('accepts batch ship payload', () => {
    const result = adminBatchShipBodySchema.safeParse({
      order_ids: ['order-1'],
      carrier: 'J&T',
      tracking_map: { 'order-1': 'TN001' },
    });
    assert.equal(result.success, true);
  });
});
