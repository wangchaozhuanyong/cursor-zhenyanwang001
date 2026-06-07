const { test } = require('node:test');
const assert = require('node:assert/strict');

function loadServiceWithRepo(repo) {
  const servicePath = require.resolve('../src/modules/admin/service/adminUserSecurity.service');
  const repoPath = require.resolve('../src/modules/admin/repository/adminUserSecurity.repository');
  delete require.cache[servicePath];
  require.cache[repoPath] = { id: repoPath, filename: repoPath, loaded: true, exports: repo };
  return require(servicePath);
}

function createRepoMock() {
  return {
    async selectManualRiskIps() {
      return [];
    },
    async selectRiskIpSignals() {
      return [
        {
          ip: '2405:3800:8ba:3c1:5c71:8838:bd01:5549',
          login_count: 7,
          related_user_count: 2,
          last_seen_at: '2026-06-07T06:01:32.000Z',
        },
      ];
    },
    async selectRiskIpEventSignals() {
      return [];
    },
    async selectRiskIpRelatedUsers() {
      return [
        {
          ip: '2405:3800:8ba:3c1:5c71:8838:bd01:5549',
          user_id: 'user-a',
          phone: '+60123456789',
          nickname: '测试用户A',
          account_status: 'active',
          login_count: 5,
          event_count: 0,
          last_seen_at: '2026-06-07T06:01:32.000Z',
        },
        {
          ip: '2405:3800:8ba:3c1:5c71:8838:bd01:5549',
          user_id: 'user-b',
          phone: '+60198765432',
          nickname: '',
          account_status: 'active',
          login_count: 2,
          event_count: 0,
          last_seen_at: '2026-06-07T05:01:32.000Z',
        },
      ];
    },
  };
}

test('listRiskIps 返回相关用户手机号并支持手机号搜索', async () => {
  const service = loadServiceWithRepo(createRepoMock());

  const result = await service.listRiskIps({ page: 1, pageSize: 20, keyword: '+60123456789' });

  assert.equal(result.total, 1);
  assert.equal(result.list[0].related_user_count, 2);
  assert.deepEqual(result.list[0].related_users.map((user) => user.phone), ['+60123456789', '+60198765432']);
});
