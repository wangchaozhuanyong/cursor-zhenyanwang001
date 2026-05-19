const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  RETURN_TRANSITIONS,
  assertReturnTransition,
} = require('../src/modules/order/returnStateMachine');

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

    it('approved -> processing should pass', () => {
      assert.doesNotThrow(() => assertReturnTransition('approved', 'processing'));
    });

    it('approved -> completed should pass', () => {
      assert.doesNotThrow(() => assertReturnTransition('approved', 'completed'));
    });

    it('processing -> completed should pass', () => {
      assert.doesNotThrow(() => assertReturnTransition('processing', 'completed'));
    });

    it('rejected -> approved should throw', () => {
      assert.throws(() => assertReturnTransition('rejected', 'approved'), /涓嶈兘浠庡敭鍚庣姸鎬?);
    });

    it('completed -> pending should throw', () => {
      assert.throws(() => assertReturnTransition('completed', 'pending'), /涓嶈兘浠庡敭鍚庣姸鎬?);
    });

    it('cancelled -> approved should throw', () => {
      assert.throws(() => assertReturnTransition('cancelled', 'approved'), /涓嶈兘浠庡敭鍚庣姸鎬?);
    });

    it('approved -> pending should throw (no backward transition)', () => {
      assert.throws(() => assertReturnTransition('approved', 'pending'), /涓嶈兘浠庡敭鍚庣姸鎬?);
    });

    it('pending -> completed should throw (skip intermediate state)', () => {
      assert.throws(() => assertReturnTransition('pending', 'completed'), /涓嶈兘浠庡敭鍚庣姸鎬?);
    });

    it('unknown status should throw', () => {
      assert.throws(() => assertReturnTransition('unknown', 'approved'), /涓嶈兘浠庡敭鍚庣姸鎬?);
    });
  });
});

