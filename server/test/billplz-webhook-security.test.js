const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');

const paymentsService = require('../src/modules/payment/service/payments.service');
const payRepo = require('../src/modules/payment/repository/payments.repository');
const billplzProvider = require('../src/modules/payment/providers/billplzProvider');
const orderApi = require('../src/modules/order/publicApi');
const adminApi = require('../src/modules/admin/publicApi');

function signBillplzBody(body, secret) {
  const source = billplzProvider.buildBillplzXSignaturePayload(body);
  return crypto.createHmac('sha256', secret).update(source).digest('hex');
}

test('Billplz webhook rejects mismatched order number before marking payment paid', async () => {
  const oldSecret = process.env.BILLPLZ_X_SIGNATURE_KEY;
  const secret = 'billplz_webhook_secret';
  process.env.BILLPLZ_X_SIGNATURE_KEY = secret;

  const original = {
    getConnection: payRepo.getConnection,
    selectPaymentEventByProviderEventId: payRepo.selectPaymentEventByProviderEventId,
    selectPaymentOrderByIdForUpdate: payRepo.selectPaymentOrderByIdForUpdate,
    insertPaymentEvent: payRepo.insertPaymentEvent,
    selectOrderByIdForUpdate: orderApi.selectOrderByIdForUpdate,
    emitEvent: adminApi.emitEvent,
  };
  const calls = {
    commit: 0,
    rollback: 0,
    release: 0,
  };
  let insertedEvent = null;
  let emittedEvent = null;

  try {
    payRepo.getConnection = async () => ({
      async beginTransaction() {},
      async commit() {
        calls.commit += 1;
      },
      async rollback() {
        calls.rollback += 1;
      },
      release() {
        calls.release += 1;
      },
    });
    payRepo.selectPaymentEventByProviderEventId = async () => null;
    payRepo.selectPaymentOrderByIdForUpdate = async (_conn, id) => ({
      id,
      provider: 'billplz',
      order_id: 'order-1',
      order_no: 'ORD-001',
      channel_code: 'billplz_fpx',
      amount: 12.34,
      currency: 'MYR',
      status: 'pending',
    });
    orderApi.selectOrderByIdForUpdate = async () => ({
      id: 'order-1',
      order_no: 'ORD-001',
      status: 'pending',
      payment_status: 'pending',
      user_id: 'user-1',
      total_amount: 12.34,
    });
    payRepo.insertPaymentEvent = async (_conn, row) => {
      insertedEvent = row;
    };
    adminApi.emitEvent = async (event) => {
      emittedEvent = event;
    };

    const body = {
      id: 'bill_1',
      paid: 'true',
      state: 'paid',
      amount: '1234',
      reference_1: 'pay_1',
      reference_2: 'ORD-WRONG',
    };
    body.x_signature = signBillplzBody(body, secret);

    await assert.rejects(
      () => paymentsService.handleMalaysiaLocalWebhook('billplz', body, {}),
      /Webhook 订单号不匹配/,
    );

    assert.equal(insertedEvent?.verify_status, 'failed');
    assert.equal(insertedEvent?.processing_result, 'rejected');
    assert.equal(insertedEvent?.failure_reason_code, 'order_no_mismatch');
    assert.equal(insertedEvent?.payload_json.expected_order_no, 'ORD-001');
    assert.equal(insertedEvent?.payload_json.order_no, 'ORD-WRONG');
    assert.equal(emittedEvent?.eventType, 'payment.order_no_mismatch');
    assert.equal(calls.commit, 1);
    assert.equal(calls.rollback, 0);
    assert.equal(calls.release, 1);
  } finally {
    payRepo.getConnection = original.getConnection;
    payRepo.selectPaymentEventByProviderEventId = original.selectPaymentEventByProviderEventId;
    payRepo.selectPaymentOrderByIdForUpdate = original.selectPaymentOrderByIdForUpdate;
    payRepo.insertPaymentEvent = original.insertPaymentEvent;
    orderApi.selectOrderByIdForUpdate = original.selectOrderByIdForUpdate;
    adminApi.emitEvent = original.emitEvent;
    if (oldSecret === undefined) delete process.env.BILLPLZ_X_SIGNATURE_KEY;
    else process.env.BILLPLZ_X_SIGNATURE_KEY = oldSecret;
  }
});

test('Billplz webhook returns duplicate before opening payment transaction', async () => {
  const oldSecret = process.env.BILLPLZ_X_SIGNATURE_KEY;
  const secret = 'billplz_webhook_secret';
  process.env.BILLPLZ_X_SIGNATURE_KEY = secret;

  const original = {
    getConnection: payRepo.getConnection,
    selectPaymentEventByProviderEventId: payRepo.selectPaymentEventByProviderEventId,
    selectPaymentOrderByIdForUpdate: payRepo.selectPaymentOrderByIdForUpdate,
    selectOrderByIdForUpdate: orderApi.selectOrderByIdForUpdate,
  };
  let connectionOpened = false;
  let paymentOrderLocked = false;
  let orderLocked = false;

  try {
    payRepo.selectPaymentEventByProviderEventId = async (_q, provider, providerEventId) => {
      assert.equal(provider, 'billplz');
      assert.equal(providerEventId, 'bill_dup');
      return { id: 'existing-event', provider_event_id: providerEventId };
    };
    payRepo.getConnection = async () => {
      connectionOpened = true;
      throw new Error('duplicate webhook must not open a transaction');
    };
    payRepo.selectPaymentOrderByIdForUpdate = async () => {
      paymentOrderLocked = true;
      throw new Error('duplicate webhook must not lock payment order');
    };
    orderApi.selectOrderByIdForUpdate = async () => {
      orderLocked = true;
      throw new Error('duplicate webhook must not lock order');
    };

    const body = {
      id: 'bill_dup',
      paid: 'true',
      state: 'paid',
      amount: '1234',
      reference_1: 'pay_1',
      reference_2: 'ORD-001',
    };
    body.x_signature = signBillplzBody(body, secret);

    const result = await paymentsService.handleMalaysiaLocalWebhook('billplz', body, {});

    assert.equal(result.data?.received, true);
    assert.equal(result.data?.duplicate, true);
    assert.equal(connectionOpened, false);
    assert.equal(paymentOrderLocked, false);
    assert.equal(orderLocked, false);
  } finally {
    payRepo.getConnection = original.getConnection;
    payRepo.selectPaymentEventByProviderEventId = original.selectPaymentEventByProviderEventId;
    payRepo.selectPaymentOrderByIdForUpdate = original.selectPaymentOrderByIdForUpdate;
    orderApi.selectOrderByIdForUpdate = original.selectOrderByIdForUpdate;
    if (oldSecret === undefined) delete process.env.BILLPLZ_X_SIGNATURE_KEY;
    else process.env.BILLPLZ_X_SIGNATURE_KEY = oldSecret;
  }
});

test('Billplz webhook rejects signed payload without provider event id', async () => {
  const oldSecret = process.env.BILLPLZ_X_SIGNATURE_KEY;
  const secret = 'billplz_webhook_secret';
  process.env.BILLPLZ_X_SIGNATURE_KEY = secret;

  const original = {
    getConnection: payRepo.getConnection,
    insertPaymentEvent: payRepo.insertPaymentEvent,
    emitEvent: adminApi.emitEvent,
  };
  let connectionOpened = false;
  let insertedEvent = null;
  let emittedEvent = null;

  try {
    payRepo.getConnection = async () => {
      connectionOpened = true;
      throw new Error('missing event id must not open a transaction');
    };
    payRepo.insertPaymentEvent = async (_q, row) => {
      insertedEvent = row;
    };
    adminApi.emitEvent = async (event) => {
      emittedEvent = event;
    };

    const body = {
      paid: 'true',
      state: 'paid',
      amount: '1234',
      reference_1: 'pay_1',
      reference_2: 'ORD-001',
    };
    body.x_signature = signBillplzBody(body, secret);

    await assert.rejects(
      () => paymentsService.handleMalaysiaLocalWebhook('billplz', body, {}),
      /Webhook provider event id 必填/,
    );

    assert.equal(insertedEvent?.verify_status, 'failed');
    assert.equal(insertedEvent?.processing_result, 'rejected');
    assert.equal(insertedEvent?.failure_reason_code, 'missing_provider_event_id');
    assert.equal(emittedEvent?.eventType, 'payment.webhook_missing_event_id');
    assert.equal(connectionOpened, false);
  } finally {
    payRepo.getConnection = original.getConnection;
    payRepo.insertPaymentEvent = original.insertPaymentEvent;
    adminApi.emitEvent = original.emitEvent;
    if (oldSecret === undefined) delete process.env.BILLPLZ_X_SIGNATURE_KEY;
    else process.env.BILLPLZ_X_SIGNATURE_KEY = oldSecret;
  }
});
