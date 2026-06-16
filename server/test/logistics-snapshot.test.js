const { afterEach, test } = require('node:test');
const assert = require('node:assert/strict');

const servicePath = require.resolve('../src/modules/logistics/service/logistics.service');
const repoPath = require.resolve('../src/modules/logistics/repository/logistics.repository');
const adapterPath = require.resolve('../src/modules/logistics/adapters/malaysiaCarrierAdapter');

function clearLogisticsCache() {
  for (const path of [servicePath, repoPath, adapterPath]) {
    delete require.cache[path];
  }
}

function loadLogisticsService({ repoOverrides = {}, adapterOverrides = {} } = {}) {
  clearLogisticsCache();
  require.cache[repoPath] = {
    id: repoPath,
    filename: repoPath,
    loaded: true,
    exports: {
      async selectOrderForTracking(orderId) {
        return {
          id: orderId,
          order_no: '#10001',
          status: 'shipped',
          tracking_no: 'MY123',
          carrier: 'J&T Express',
          logistics_last_synced_at: null,
        };
      },
      async selectTracksByOrderId() {
        return [];
      },
      async selectTracksByReturnId() {
        return [];
      },
      async replaceAdapterTracks() {},
      async replaceAdapterReturnShipmentTracks() {},
      async insertManualOrderTrack() {},
      async updateOrderLogisticsSnapshot() {},
      ...repoOverrides,
    },
  };
  require.cache[adapterPath] = {
    id: adapterPath,
    filename: adapterPath,
    loaded: true,
    exports: {
      resolveCarrier(carrier = '') {
        return { code: 'jnt_my', label: carrier || 'J&T Express', url: 'https://www.jtexpress.my/track' };
      },
      async fetchTracking() {
        return { carrier: { code: 'jnt_my', label: 'J&T Express', url: 'https://www.jtexpress.my/track' }, events: [] };
      },
      ...adapterOverrides,
    },
  };
  return require(servicePath);
}

afterEach(() => {
  clearLogisticsCache();
});

test('refreshOrderTracking syncs carrier exception into order logistics snapshot', async () => {
  let insertedEvents = [];
  let savedSnapshot = null;
  const service = loadLogisticsService({
    adapterOverrides: {
      async fetchTracking() {
        return {
          carrier: { code: 'jnt_my', label: 'J&T Express', url: 'https://www.jtexpress.my/track' },
          events: [{
            id: 'track-1',
            status: 'delayed',
            title: 'Shipment delayed',
            description: 'Delayed due to weather',
            eventTime: '2026-06-15 10:00:00',
          }],
        };
      },
    },
    repoOverrides: {
      async replaceAdapterTracks(_orderId, _trackingNo, _carrierCode, events) {
        insertedEvents = events;
      },
      async selectTracksByOrderId(orderId) {
        return insertedEvents.map((event) => ({
          id: event.id,
          order_id: orderId,
          tracking_no: event.trackingNo,
          carrier: event.carrier,
          carrier_code: event.carrierCode,
          status: event.status,
          status_label: '',
          exception_type: event.exceptionType,
          severity: event.severity,
          title: event.title,
          description: event.description,
          location: event.location,
          event_time: event.eventTime,
          source: 'adapter',
        }));
      },
      async updateOrderLogisticsSnapshot(_orderId, snapshot) {
        savedSnapshot = snapshot;
      },
    },
  });

  const result = await service.refreshOrderTracking('order-1');

  assert.equal(insertedEvents[0].status, 'delayed');
  assert.equal(insertedEvents[0].exceptionType, 'delayed');
  assert.equal(insertedEvents[0].severity, 'warning');
  assert.equal(savedSnapshot.status, 'delayed');
  assert.equal(savedSnapshot.exceptionType, 'delayed');
  assert.equal(savedSnapshot.hasException, true);
  assert.equal(result.data.logistics_snapshot.statusLabel, '物流延误');
});

test('recordOrderShipment writes a manual shipped track and snapshot', async () => {
  let manualEvent = null;
  let savedSnapshot = null;
  const service = loadLogisticsService({
    repoOverrides: {
      async insertManualOrderTrack(_orderId, event) {
        manualEvent = event;
      },
      async selectTracksByOrderId(orderId) {
        if (!manualEvent) return [];
        return [{
          id: manualEvent.id,
          order_id: orderId,
          tracking_no: manualEvent.trackingNo,
          carrier: manualEvent.carrier,
          carrier_code: manualEvent.carrierCode,
          status: manualEvent.status,
          exception_type: manualEvent.exceptionType,
          severity: manualEvent.severity,
          title: manualEvent.title,
          description: manualEvent.description,
          location: manualEvent.location,
          event_time: manualEvent.eventTime,
          source: 'manual',
        }];
      },
      async updateOrderLogisticsSnapshot(_orderId, snapshot) {
        savedSnapshot = snapshot;
      },
    },
  });

  await service.recordOrderShipment('order-1', { trackingNo: 'MY123', carrier: 'J&T Express' });

  assert.equal(manualEvent.status, 'shipped');
  assert.equal(manualEvent.title, '订单已发货');
  assert.equal(savedSnapshot.status, 'shipped');
  assert.equal(savedSnapshot.statusLabel, '已发货');
  assert.equal(savedSnapshot.hasException, false);
});
