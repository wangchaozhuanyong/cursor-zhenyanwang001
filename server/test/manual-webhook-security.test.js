const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const paymentsService = require('../src/modules/payment/service/payments.service');
const payRepo = require('../src/modules/payment/repository/payments.repository');

function stableStringify(value) {
  if (value === null || value === undefined) return 'null';
  if (typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`;
}

function signBody(body, secret) {
  const crypto = require('crypto');
  const timestamp = String(body.timestamp || body.ts);
  const nonce = String(body.nonce || '');
  const clone = { ...body };
  delete clone.secret;
  delete clone.signature;
  const payload = `${timestamp}.${nonce}.${stableStringify(clone)}`;
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

describe('manual webhook security', () => {
  test('accepts valid signed event and records provider_event_id', async () => {
    const oldSecret = process.env.PAYMENT_MANUAL_WEBHOOK_SECRET;
    const oldSkew = process.env.PAYMENT_MANUAL_WEBHOOK_MAX_SKEW_SECONDS;
    process.env.PAYMENT_MANUAL_WEBHOOK_SECRET = 'unit_test_secret_123';
    process.env.PAYMENT_MANUAL_WEBHOOK_MAX_SKEW_SECONDS = '300';

    const original = {
      selectPaymentEventByProviderEventId: payRepo.selectPaymentEventByProviderEventId,
      insertPaymentEvent: payRepo.insertPaymentEvent,
    };

    let insertedRow = null;
    try {
      payRepo.selectPaymentEventByProviderEventId = async () => null;
      payRepo.insertPaymentEvent = async (_q, row) => {
        insertedRow = row;
      };

      const body = {
        event_id: 'evt_manual_001',
        order_id: 'order_001',
        timestamp: String(Date.now()),
        nonce: 'nonce_12345678',
      };
      body.signature = signBody(body, process.env.PAYMENT_MANUAL_WEBHOOK_SECRET);

      const result = await paymentsService.handleManualWebhook('manual', body);
      assert.equal(result.data?.received, true);
      assert.equal(insertedRow?.provider_event_id, 'evt_manual_001');
      assert.equal(insertedRow?.provider, 'manual');
    } finally {
      payRepo.selectPaymentEventByProviderEventId = original.selectPaymentEventByProviderEventId;
      payRepo.insertPaymentEvent = original.insertPaymentEvent;
      process.env.PAYMENT_MANUAL_WEBHOOK_SECRET = oldSecret;
      process.env.PAYMENT_MANUAL_WEBHOOK_MAX_SKEW_SECONDS = oldSkew;
    }
  });

  test('rejects invalid signature', async () => {
    const oldSecret = process.env.PAYMENT_MANUAL_WEBHOOK_SECRET;
    process.env.PAYMENT_MANUAL_WEBHOOK_SECRET = 'unit_test_secret_123';
    try {
      const body = {
        event_id: 'evt_manual_bad_sig',
        order_id: 'order_001',
        timestamp: String(Date.now()),
        nonce: 'nonce_12345678',
        signature: 'bad_signature',
      };
      await assert.rejects(
        () => paymentsService.handleManualWebhook('manual', body),
        /ValidationError/i,
      );
    } finally {
      process.env.PAYMENT_MANUAL_WEBHOOK_SECRET = oldSecret;
    }
  });

  test('returns duplicate without reinserting when event_id already exists', async () => {
    const oldSecret = process.env.PAYMENT_MANUAL_WEBHOOK_SECRET;
    process.env.PAYMENT_MANUAL_WEBHOOK_SECRET = 'unit_test_secret_123';
    const original = {
      selectPaymentEventByProviderEventId: payRepo.selectPaymentEventByProviderEventId,
      insertPaymentEvent: payRepo.insertPaymentEvent,
    };
    let inserted = 0;
    try {
      payRepo.selectPaymentEventByProviderEventId = async () => ({ id: 'existing_event' });
      payRepo.insertPaymentEvent = async () => {
        inserted += 1;
      };
      const body = {
        event_id: 'evt_manual_dup',
        order_id: 'order_001',
        timestamp: String(Date.now()),
        nonce: 'nonce_12345678',
      };
      body.signature = signBody(body, process.env.PAYMENT_MANUAL_WEBHOOK_SECRET);

      const result = await paymentsService.handleManualWebhook('manual', body);
      assert.equal(result.data?.received, true);
      assert.equal(result.data?.duplicate, true);
      assert.equal(inserted, 0);
    } finally {
      payRepo.selectPaymentEventByProviderEventId = original.selectPaymentEventByProviderEventId;
      payRepo.insertPaymentEvent = original.insertPaymentEvent;
      process.env.PAYMENT_MANUAL_WEBHOOK_SECRET = oldSecret;
    }
  });
});

