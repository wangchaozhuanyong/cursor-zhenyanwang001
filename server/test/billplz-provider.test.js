const { test, describe, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const billplzProvider = require('../src/modules/payment/providers/billplzProvider');

const originalFetch = global.fetch;
const originalEnv = { ...process.env };

function restoreEnv() {
  for (const key of Object.keys(process.env)) {
    if (!Object.prototype.hasOwnProperty.call(originalEnv, key)) delete process.env[key];
  }
  Object.assign(process.env, originalEnv);
  global.fetch = originalFetch;
}

afterEach(() => {
  restoreEnv();
});

describe('billplz provider', () => {
  test('creates a real Billplz bill with cents amount and payment order reference', async () => {
    let request = null;
    global.fetch = async (url, options) => {
      request = { url, options, body: options.body.toString() };
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({
          id: 'bill_123',
          collection_id: 'col_123',
          paid: false,
          state: 'due',
          amount: 1234,
          url: 'https://www.billplz.com/bills/bill_123',
        }),
      };
    };

    const result = await billplzProvider.createIntent({
      channel: {
        code: 'billplz_fpx',
        provider: 'billplz',
        currency: 'MYR',
        environment: 'sandbox',
        config_json: JSON.stringify({
          api_base_url: 'https://sandbox.example/api/v3',
          api_key: 'secret-key',
          collection_id: 'col_123',
          callback_url: 'https://api.example.com/api/payments/webhooks/billplz',
        }),
      },
      order: {
        id: 'order_1',
        order_no: 'ORD-001',
        total_amount: '12.34',
        contact_name: 'Ali',
        contact_phone: '+60123456789',
      },
      paymentOrderId: 'pay_1',
      returnUrl: 'https://shop.example.com/payment/result?order_id=order_1',
      provider: 'billplz',
    });

    assert.equal(result.redirectUrl, 'https://www.billplz.com/bills/bill_123');
    assert.equal(result.raw.gateway_mode, 'billplz_api');
    assert.equal(result.raw.bill_id, 'bill_123');
    assert.equal(request.url, 'https://sandbox.example/api/v3/bills');
    assert.equal(request.options.method, 'POST');
    assert.equal(
      request.options.headers.Authorization,
      `Basic ${Buffer.from('secret-key:').toString('base64')}`,
    );
    const params = new URLSearchParams(request.body);
    assert.equal(params.get('collection_id'), 'col_123');
    assert.equal(params.get('amount'), '1234');
    assert.equal(params.get('callback_url'), 'https://api.example.com/api/payments/webhooks/billplz');
    assert.equal(params.get('redirect_url'), 'https://shop.example.com/payment/result?order_id=order_1');
    assert.equal(params.get('reference_1_label'), 'Payment Order');
    assert.equal(params.get('reference_1'), 'pay_1');
    assert.equal(params.get('reference_2'), 'ORD-001');
    assert.equal(params.get('mobile'), '+60123456789');
  });

  test('rejects Billplz creation when api key or collection id is missing', async () => {
    await assert.rejects(
      () => billplzProvider.createIntent({
        channel: {
          code: 'billplz_fpx',
          provider: 'billplz',
          currency: 'MYR',
          config_json: '{}',
        },
        order: {
          id: 'order_1',
          order_no: 'ORD-001',
          total_amount: '12.34',
          contact_name: 'Ali',
          contact_phone: '+60123456789',
        },
        paymentOrderId: 'pay_1',
        returnUrl: '',
        provider: 'billplz',
      }),
      /BILLPLZ_API_KEY 与 BILLPLZ_COLLECTION_ID/,
    );
  });

  test('verifies Billplz X Signature callback payload', () => {
    const secret = 'x-signature-secret';
    const body = {
      id: 'W_79pJDk',
      collection_id: '599',
      paid: 'true',
      state: 'paid',
      amount: '200',
      reference_1: 'pay_1',
    };
    const source = billplzProvider.buildBillplzXSignaturePayload(body);
    const xSignature = crypto.createHmac('sha256', secret).update(source).digest('hex');
    const result = billplzProvider.verifySignature({
      body: { ...body, x_signature: xSignature },
      secret,
    });
    assert.equal(result.ok, true);
  });

  test('normalizes Billplz webhook amount from cents to MYR', () => {
    const normalized = billplzProvider.normalizeWebhookPayload({
      id: 'W_79pJDk',
      paid: 'true',
      state: 'paid',
      amount: '1234',
      reference_1: 'pay_1',
      reference_2: 'ORD-001',
    });
    assert.equal(normalized.eventId, 'W_79pJDk');
    assert.equal(normalized.paymentOrderId, 'pay_1');
    assert.equal(normalized.orderNo, 'ORD-001');
    assert.equal(normalized.transactionNo, 'W_79pJDk');
    assert.equal(normalized.status, 'paid');
    assert.equal(normalized.amount, 12.34);
    assert.equal(normalized.currency, 'MYR');
  });
});
