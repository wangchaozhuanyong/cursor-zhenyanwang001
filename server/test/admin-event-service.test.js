const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

function loadWithMocks() {
  const servicePath = require.resolve('../src/modules/admin/service/adminEvent.service');
  const repoPath = require.resolve('../src/modules/admin/repository/adminEvent.repository');
  const busPath = require.resolve('../src/modules/admin/service/adminEventBus.service');
  delete require.cache[servicePath];

  const records = new Map();
  const active = new Map();
  const actions = [];
  const userStates = new Map();
  const frames = [];

  const repo = {
    async findRuleByType(eventType) {
      return {
        event_type: eventType,
        category: eventType.split('.')[0],
        severity: 'P1',
        title: eventType,
        enabled: 1,
        popup_enabled: 1,
        sound_enabled: 0,
        escalation_minutes: 30,
        escalation_target: 'admin_manager',
      };
    },
    async insertRecord(payload) {
      if (payload.activeDedupeKey && active.has(payload.activeDedupeKey)) {
        const row = records.get(active.get(payload.activeDedupeKey));
        row.seen_count += 1;
        row.message = payload.message;
        row.payload = payload.payload;
        return;
      }
      const row = {
        id: payload.id,
        event_type: payload.eventType,
        category: payload.category,
        severity: payload.severity,
        status: payload.status,
        title: payload.title,
        message: payload.message,
        entity_type: payload.entityType,
        entity_id: payload.entityId,
        fingerprint: payload.fingerprint,
        active_dedupe_key: payload.activeDedupeKey,
        payload: payload.payload,
        impact_amount: payload.impactAmount,
        source: payload.source,
        seen_count: 1,
        created_at: new Date(),
        updated_at: new Date(),
      };
      records.set(row.id, row);
      if (row.active_dedupe_key) active.set(row.active_dedupe_key, row.id);
    },
    async findRecordByActiveDedupeKey(key) {
      return active.has(key) ? records.get(active.get(key)) : null;
    },
    async findRecordById(id) {
      return records.get(id) || null;
    },
    async insertAction(payload) {
      actions.push(payload);
    },
    async updateRecordStatus(eventId, status) {
      const row = records.get(eventId);
      row.status = status;
      if (['resolved', 'auto_resolved', 'ignored', 'expired'].includes(status)) {
        active.delete(row.active_dedupe_key);
        row.active_dedupe_key = null;
      }
    },
    async upsertUserState(eventId, adminUserId, fields) {
      userStates.set(`${eventId}:${adminUserId}`, { eventId, adminUserId, ...fields });
    },
    async listEvents(_query, adminUserId) {
      return [...records.values()].map((row) => {
        const state = userStates.get(`${row.id}:${adminUserId}`) || {};
        return {
          ...row,
          read_at: state.readAt || null,
          hidden_at: state.hiddenAt || null,
          sound_played_at: state.soundPlayedAt || null,
          popup_seen_at: state.popupSeenAt || null,
        };
      });
    },
    async countEvents() {
      return records.size;
    },
  };

  require.cache[repoPath] = { id: repoPath, filename: repoPath, loaded: true, exports: repo };
  require.cache[busPath] = {
    id: busPath,
    filename: busPath,
    loaded: true,
    exports: { publishAdminEvent: (frame) => frames.push(frame) },
  };
  const service = require(servicePath);
  return { service, records, actions, userStates, frames };
}

describe('admin event service', () => {
  beforeEach(() => {
    for (const key of Object.keys(require.cache)) {
      if (key.includes('adminEvent.service')) delete require.cache[key];
    }
  });

  test('dedupes unresolved events and creates a new historical event after resolve', async () => {
    const { service, records } = loadWithMocks();
    const input = {
      eventType: 'payment.amount_mismatch',
      entityType: 'order',
      entityId: 'order-1',
      title: 'amount mismatch',
      fingerprint: { eventType: 'payment.amount_mismatch', entityType: 'order', entityId: 'order-1' },
    };

    const first = await service.emitEvent(input);
    const second = await service.emitEvent(input);
    assert.equal(first.inserted, true);
    assert.equal(second.inserted, false);
    assert.equal(records.size, 1);
    assert.equal([...records.values()][0].seen_count, 2);

    await service.resolve(first.event.id, 'admin-1', { remark: '已核对测试事件', validationPassed: true });
    const third = await service.emitEvent(input);
    assert.equal(third.inserted, true);
    assert.equal(records.size, 2);
  });

  test('keeps per-admin read state isolated', async () => {
    const { service } = loadWithMocks();
    const created = await service.emitEvent({
      eventType: 'security.rbac_change',
      entityType: 'rbac',
      entityId: 'role-1',
      title: 'rbac changed',
    });

    await service.markUserState(created.event.id, 'admin-a', 'read');
    const a = await service.listEvents({}, 'admin-a');
    const b = await service.listEvents({}, 'admin-b');

    assert.ok(a.list[0].readAt);
    assert.equal(b.list[0].readAt, null);
  });
});
