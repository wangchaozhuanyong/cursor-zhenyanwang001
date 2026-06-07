const net = require('net');
const geoip = require('geoip-lite');

let regionNameFormatter = null;
try {
  regionNameFormatter = new Intl.DisplayNames(['zh-CN'], { type: 'region' });
} catch {
  regionNameFormatter = null;
}

function cleanText(value, max = 120) {
  return String(value || '').trim().slice(0, max);
}

function normalizeIpForLookup(value) {
  let ip = cleanText(value, 80);
  if (!ip) return '';
  if (ip.startsWith('[') && ip.endsWith(']')) ip = ip.slice(1, -1);
  const zoneIndex = ip.indexOf('%');
  if (zoneIndex > -1) ip = ip.slice(0, zoneIndex);
  if (ip.toLowerCase().startsWith('::ffff:')) ip = ip.slice(7);
  return ip;
}

function parseIpv4Parts(ip) {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  const nums = parts.map((part) => Number(part));
  if (nums.some((num, index) => !Number.isInteger(num) || num < 0 || num > 255 || String(num) !== parts[index])) {
    return null;
  }
  return nums;
}

function classifyIpv4(ip) {
  const parts = parseIpv4Parts(ip);
  if (!parts) return '';
  const [a, b] = parts;
  if (a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)) return '内网地址';
  if (a === 127) return '本机地址';
  if (a === 169 && b === 254) return '链路本地地址';
  if (a === 0) return '未指定地址';
  if (a >= 224) return '保留地址';
  return '';
}

function classifyIpv6(ip) {
  const lower = ip.toLowerCase();
  if (lower === '::1' || lower === '0:0:0:0:0:0:0:1') return '本机地址';
  if (lower === '::' || lower === '0:0:0:0:0:0:0:0') return '未指定地址';
  const first = parseInt(lower.split(':')[0] || '0', 16);
  if (Number.isNaN(first)) return '';
  if ((first & 0xfe00) === 0xfc00) return '内网地址';
  if ((first & 0xffc0) === 0xfe80) return '链路本地地址';
  if ((first & 0xff00) === 0xff00) return '保留地址';
  if (lower.startsWith('2001:db8:') || lower === '2001:db8::') return '文档示例地址';
  return '';
}

function formatCountryName(countryCode) {
  const code = cleanText(countryCode, 8).toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return '';
  if (!regionNameFormatter) return code;
  try {
    const name = regionNameFormatter.of(code);
    return name && name !== code ? name : code;
  } catch {
    return code;
  }
}

function uniqueParts(parts) {
  const seen = new Set();
  return parts.filter((part) => {
    const value = cleanText(part);
    const key = value.toLowerCase();
    if (!value || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function resolveIpLocation(value) {
  const ip = normalizeIpForLookup(value);
  if (!ip) return null;

  const family = net.isIP(ip);
  if (!family) {
    return {
      ip,
      country_code: null,
      country: null,
      region: null,
      city: null,
      timezone: null,
      label: 'IP 格式异常',
      source: 'invalid',
    };
  }

  const specialLabel = family === 4 ? classifyIpv4(ip) : classifyIpv6(ip);
  if (specialLabel) {
    return {
      ip,
      country_code: null,
      country: null,
      region: null,
      city: null,
      timezone: null,
      label: specialLabel,
      source: 'special',
    };
  }

  const found = geoip.lookup(ip);
  const countryCode = cleanText(found?.country, 8).toUpperCase();
  const country = formatCountryName(countryCode);
  const region = cleanText(found?.region, 80);
  const city = cleanText(found?.city, 120);
  const label = uniqueParts([country, region, city]).join(' / ') || '归属地未知';

  return {
    ip,
    country_code: countryCode || null,
    country: country || null,
    region: region || null,
    city: city || null,
    timezone: cleanText(found?.timezone, 80) || null,
    label,
    source: found ? 'geoip-lite' : 'unknown',
  };
}

module.exports = {
  normalizeIpForLookup,
  resolveIpLocation,
};
