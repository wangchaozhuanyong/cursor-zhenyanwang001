const { test } = require('node:test');
const assert = require('node:assert/strict');
const { normalizeIpForLookup, resolveIpLocation } = require('../src/utils/ipLocation');

test('normalizeIpForLookup 处理 IPv4-mapped IPv6 与 IPv6 zone id', () => {
  assert.equal(normalizeIpForLookup('::ffff:127.0.0.1'), '127.0.0.1');
  assert.equal(normalizeIpForLookup('[fe80::1%lo0]'), 'fe80::1');
});

test('resolveIpLocation 标记本机和内网地址', () => {
  assert.equal(resolveIpLocation('127.0.0.1').label, '本机地址');
  assert.equal(resolveIpLocation('10.1.2.3').label, '内网地址');
  assert.equal(resolveIpLocation('fd00::1').label, '内网地址');
});

test('resolveIpLocation 为公网 IP 返回可展示结构', () => {
  const location = resolveIpLocation('8.8.8.8');
  assert.equal(location.ip, '8.8.8.8');
  assert.ok(location.label);
  assert.ok(['geoip-lite', 'unknown'].includes(location.source));
});
