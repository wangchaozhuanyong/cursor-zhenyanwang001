const assert = require('node:assert/strict');
const test = require('node:test');

process.env.AUDIT_LOG_DISABLED = '1';

const repo = require('../src/modules/user/repository/privacy.repository');
const privacyService = require('../src/modules/user/service/privacy.service');

test('anonymizeOrders uses parameterized anonymized fields', async () => {
  const calls = [];
  const conn = {
    async query(sql, params) {
      calls.push({ sql, params });
      return [{ affectedRows: 1 }];
    },
  };

  const affected = await repo.anonymizeOrders(conn, 'user-1');

  assert.equal(affected, 1);
  assert.equal(calls.length, 1);
  assert.match(calls[0].sql, /contact_name = \?/);
  assert.match(calls[0].sql, /address = \?/);
  assert.deepEqual(calls[0].params, ['\u5df2\u533f\u540d', '\u5df2\u533f\u540d', 'user-1']);
});

test('cancelAccount accepts storefront confirmation text', async () => {
  const originals = {
    getConnection: repo.getConnection,
    selectUserForDeletion: repo.selectUserForDeletion,
    anonymizeUser: repo.anonymizeUser,
    anonymizeOrders: repo.anonymizeOrders,
    deleteAddresses: repo.deleteAddresses,
  };
  const conn = {
    async beginTransaction() {},
    async commit() {},
    async rollback() {},
    release() {},
  };

  try {
    repo.getConnection = async () => conn;
    repo.selectUserForDeletion = async () => ({ id: 'user-1', phone: '+60123456789', nickname: 'tester' });
    repo.anonymizeUser = async () => 1;
    repo.anonymizeOrders = async () => 0;
    repo.deleteAddresses = async () => 0;

    const result = await privacyService.cancelAccount('user-1', { confirmText: '\u6ce8\u9500\u8d26\u53f7' }, {});

    assert.equal(result.message, '\u8d26\u53f7\u5df2\u6ce8\u9500');
  } finally {
    repo.getConnection = originals.getConnection;
    repo.selectUserForDeletion = originals.selectUserForDeletion;
    repo.anonymizeUser = originals.anonymizeUser;
    repo.anonymizeOrders = originals.anonymizeOrders;
    repo.deleteAddresses = originals.deleteAddresses;
  }
});
