/**
 * DB integration smoke test for admin user tags.
 */
require('./setupTestEnv').requireTestDatabase();
require('./_dbCleanup.test');
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const svc = require('../src/modules/admin/service/adminUser.service');
const db = require('../src/config/db');
const { generateId } = require('../src/utils/helpers');

const mockReq = {};

describe('admin user tags', () => {
  test('listUserTags + create + setUserTags + listUsers filter + delete', async () => {
    let [[user]] = await db.query('SELECT id FROM users LIMIT 1');
    if (!user?.id) {
      const id = generateId();
      await db.query(
        'INSERT INTO users (id, phone, password_hash, nickname, invite_code) VALUES (?, ?, ?, ?, ?)',
        [id, `tag-test-${Date.now()}`, 'test-only', 'tag-test', `tag${Date.now()}`],
      );
      [[user]] = await db.query('SELECT id FROM users WHERE id = ? LIMIT 1', [id]);
    }
    assert.ok(user?.id, 'requires at least one user row');

    const listed = await svc.listUserTags();
    assert.ok(Array.isArray(listed.data), 'listUserTags should return data array');

    const name = `smoke-tag-${Date.now()}`;
    const created = await svc.createUserTag({ name, color: '#2563eb' }, null, mockReq);
    assert.ok(created.data?.id, 'createUserTag should return id');

    const assigned = await svc.setUserTags(user.id, { tagIds: [created.data.id] }, null, mockReq);
    assert.ok(Array.isArray(assigned.data), 'setUserTags should return tag array');
    assert.ok(assigned.data.some((t) => t.id === created.data.id), 'created tag should be assigned');

    const page = await svc.listUsers({ page: '1', pageSize: '50', tagId: created.data.id });
    assert.ok(
      page.list.some((u) => u.id === user.id && Array.isArray(u.tags) && u.tags.some((t) => t.id === created.data.id)),
      'tagId filter should include assigned user',
    );

    await svc.deleteUserTag(created.data.id, null, mockReq);

    const cleared = await svc.setUserTags(user.id, { tagIds: [] }, null, mockReq);
    assert.equal(cleared.data.length, 0, 'setUserTags should clear tags');
  });
});
