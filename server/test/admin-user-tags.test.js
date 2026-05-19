/**
 * 鐢ㄦ埛鏍囩锛氭湇鍔″眰鍐掔儫锛堥渶 MySQL 宸茶縼绉?037_user_tags銆乽sers 琛ㄦ湁鏁版嵁锛? */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
require('./_dbCleanup.test');
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const svc = require('../src/modules/admin/service/adminUser.service');
const db = require('../src/config/db');

const mockReq = {};

describe('admin user tags', () => {
  test('listUserTags + create + setUserTags + listUsers filter + delete', async () => {
    const [[user]] = await db.query('SELECT id FROM users LIMIT 1');
    assert.ok(user?.id, '闇€瑕佽嚦灏戜竴鏉?users 璁板綍');

    const listed = await svc.listUserTags();
    assert.ok(Array.isArray(listed.data), 'listUserTags 搴旇繑鍥炴暟缁?data');

    const name = `smoke-tag-${Date.now()}`;
    const created = await svc.createUserTag({ name, color: '閲戣壊' }, null, mockReq);
    assert.ok(created.data?.id, '鍒涘缓鏍囩搴旇繑鍥?id');

    const assigned = await svc.setUserTags(user.id, { tagIds: [created.data.id] }, null, mockReq);
    assert.ok(Array.isArray(assigned.data), 'setUserTags 搴旇繑鍥炴爣绛炬暟缁?);
    assert.ok(assigned.data.some((t) => t.id === created.data.id), '鐢ㄦ埛搴斿甫涓婃柊寤烘爣绛?);

    const page = await svc.listUsers({ page: '1', pageSize: '50', tagId: created.data.id });
    assert.ok(page.list.some((u) => u.id === user.id && Array.isArray(u.tags) && u.tags.some((t) => t.id === created.data.id)), '鎸?tagId 绛涢€夊簲鍖呭惈璇ョ敤鎴?);

    await svc.deleteUserTag(created.data.id, null, mockReq);

    const cleared = await svc.setUserTags(user.id, { tagIds: [] }, null, mockReq);
    assert.equal(cleared.data.length, 0, '娓呯┖鍚庢爣绛惧簲涓虹┖鏁扮粍');
  });
});

