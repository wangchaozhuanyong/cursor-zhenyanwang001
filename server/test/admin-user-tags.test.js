/**
 * 用户标签：服务层冒烟（需 MySQL 已迁移 037_user_tags、users 表有数据）
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
require('./_dbCleanup.test');
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const svc = require('../src/modules/admin/adminUser.service');
const db = require('../src/config/db');

const mockReq = {};

describe('admin user tags', () => {
  test('listUserTags + create + setUserTags + listUsers filter + delete', async () => {
    const [[user]] = await db.query('SELECT id FROM users LIMIT 1');
    assert.ok(user?.id, '需要至少一条 users 记录');

    const listed = await svc.listUserTags();
    assert.ok(Array.isArray(listed.data), 'listUserTags 应返回数组 data');

    const name = `smoke-tag-${Date.now()}`;
    const created = await svc.createUserTag({ name, color: '金色' }, null, mockReq);
    assert.ok(created.data?.id, '创建标签应返回 id');

    const assigned = await svc.setUserTags(user.id, { tagIds: [created.data.id] }, null, mockReq);
    assert.ok(Array.isArray(assigned.data), 'setUserTags 应返回标签数组');
    assert.ok(assigned.data.some((t) => t.id === created.data.id), '用户应带上新建标签');

    const page = await svc.listUsers({ page: '1', pageSize: '50', tagId: created.data.id });
    assert.ok(page.list.some((u) => u.id === user.id && Array.isArray(u.tags) && u.tags.some((t) => t.id === created.data.id)), '按 tagId 筛选应包含该用户');

    await svc.deleteUserTag(created.data.id, null, mockReq);

    const cleared = await svc.setUserTags(user.id, { tagIds: [] }, null, mockReq);
    assert.equal(cleared.data.length, 0, '清空后标签应为空数组');
  });
});
