const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mapMaxmindCityRecord, normalizeIpForLookup, resolveIpLocation } = require('../src/utils/ipLocation');
const { getClientIp } = require('../src/utils/clientIp');

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
  assert.equal(location.ip_type, 'IPv4');
  assert.ok(location.label);
  assert.ok(['geoip-lite', 'unknown'].includes(location.source));
});

test('resolveIpLocation 返回 IPv6 类型和城市缺失说明', () => {
  const location = resolveIpLocation('2405:3800:8ba:3c1:5c71:8838:bd01:5549');
  assert.equal(location.ip, '2405:3800:8ba:3c1:5c71:8838:bd01:5549');
  assert.equal(location.ip_type, 'IPv6');
  assert.ok(['geoip-lite', 'unknown'].includes(location.source));
});

test('getClientIp 优先使用 CDN 和反向代理真实客户端 IP', () => {
  assert.equal(getClientIp({
    headers: {
      'cf-connecting-ip': '2405:3800:8ba:3c1:5c71:8838:bd01:5549',
      'x-forwarded-for': '13.212.179.213, 10.0.0.1',
    },
    ip: '127.0.0.1',
  }), '2405:3800:8ba:3c1:5c71:8838:bd01:5549');

  assert.equal(getClientIp({
    headers: {
      'x-forwarded-for': '13.212.179.213, 10.0.0.1',
    },
    ip: '127.0.0.1',
  }), '13.212.179.213');

  assert.equal(getClientIp({
    headers: {},
    ip: '::ffff:192.168.1.10',
  }), '192.168.1.10');
});

test('mapMaxmindCityRecord 映射城市库结果为后台可读结构', () => {
  const location = mapMaxmindCityRecord({
    country: { iso_code: 'MY', names: { en: 'Malaysia', 'zh-CN': '马来西亚' } },
    subdivisions: [{ iso_code: '14', names: { en: 'Kuala Lumpur', 'zh-CN': '吉隆坡' } }],
    city: { names: { en: 'Kuala Lumpur', 'zh-CN': '吉隆坡' } },
    location: { time_zone: 'Asia/Kuala_Lumpur' },
  }, '2001:db8::1', 'IPv6');

  assert.equal(location.country_code, 'MY');
  assert.equal(location.country, '马来西亚');
  assert.equal(location.region, '吉隆坡');
  assert.equal(location.city, '吉隆坡');
  assert.equal(location.timezone, 'Asia/Kuala_Lumpur');
  assert.equal(location.source, 'maxmind-geolite2-city');
  assert.equal(location.city_missing_reason, null);
});
