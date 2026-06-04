const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  RETURN_TRANSITIONS,
  assertReturnTransition,
} = require('../src/modules/order/returnStateMachine');
const { BusinessError } = require('../src/errors');

describe('Return State Machine', () => {
  it('should define transitions for all known statuses', () => {
    const expectedStatuses = ['pending', 'approved', 'rejected', 'processing', 'completed', 'cancelled'];
    for (const s of expectedStatuses) {
      assert.ok(Array.isArray(RETURN_TRANSITIONS[s]), `Missing transition for "${s}"`);
    }
  });

  describe('assertReturnTransition', () => {
    it('pending -> approved should pass', () => {
      assert.doesNotThrow(() => assertReturnTransition('pending', 'approved'));
    });

    it('pending -> rejected should pass', () => {
      assert.doesNotThrow(() => assertReturnTransition('pending', 'rejected'));
    });

    it('pending -> cancelled should pass', () => {
      assert.doesNotThrow(() => assertReturnTransition('pending', 'cancelled'));
    });

    it('pending -> need_evidence should pass', () => {
      assert.doesNotThrow(() => assertReturnTransition('pending', 'need_evidence'));
    });

    it('need_evidence -> pending should pass after buyer supplements proof', () => {
      assert.doesNotThrow(() => assertReturnTransition('need_evidence', 'pending'));
    });

    it('approved -> processing should pass', () => {
      assert.doesNotThrow(() => assertReturnTransition('approved', 'processing'));
    });

    it('approved -> waiting_return should pass', () => {
      assert.doesNotThrow(() => assertReturnTransition('approved', 'waiting_return'));
    });

    it('approved -> completed should pass', () => {
      assert.doesNotThrow(() => assertReturnTransition('approved', 'completed'));
    });

    it('waiting_return -> return_in_transit should pass after buyer submits logistics', () => {
      assert.doesNotThrow(() => assertReturnTransition('waiting_return', 'return_in_transit'));
    });

    it('return_in_transit -> received should pass after merchant receives return', () => {
      assert.doesNotThrow(() => assertReturnTransition('return_in_transit', 'received'));
    });

    it('processing -> completed should pass', () => {
      assert.doesNotThrow(() => assertReturnTransition('processing', 'completed'));
    });

    it('received -> exchange_shipping should pass for exchange flow', () => {
      assert.doesNotThrow(() => assertReturnTransition('received', 'exchange_shipping'));
    });

    it('exchange_shipping -> completed should pass after buyer confirms', () => {
      assert.doesNotThrow(() => assertReturnTransition('exchange_shipping', 'completed'));
    });

    it('rejected -> approved should throw', () => {
      assert.throws(() => assertReturnTransition('rejected', 'approved'), BusinessError);
    });

    it('completed -> pending should throw', () => {
      assert.throws(() => assertReturnTransition('completed', 'pending'), BusinessError);
    });

    it('cancelled -> approved should throw', () => {
      assert.throws(() => assertReturnTransition('cancelled', 'approved'), BusinessError);
    });

    it('approved -> pending should throw (no backward transition)', () => {
      assert.throws(() => assertReturnTransition('approved', 'pending'), BusinessError);
    });

    it('pending -> completed should throw (skip intermediate state)', () => {
      assert.throws(() => assertReturnTransition('pending', 'completed'), BusinessError);
    });

    it('unknown status should throw', () => {
      assert.throws(() => assertReturnTransition('unknown', 'approved'), BusinessError);
    });
  });
});
