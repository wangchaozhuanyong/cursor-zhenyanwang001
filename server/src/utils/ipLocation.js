const net = require('net');
const fs = require('fs');
const geoip = require('geoip-lite');
const maxmind = require('maxmind');

let maxmindReader = null;
let maxmindLoadAttempted = false;
let maxmindWarned = false;

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

/**
 * @param {Record<string, unknown> | null | undefined} names
 */
function pickName(names = {}) {
  if (!names || typeof names !== 'object') return '';
  const nameMap = /** @type {Record<string, unknown>} */ (names);
  return cleanText(
    nameMap['zh-CN']
      || nameMap.zh
      || nameMap.en
      || Object.values(nameMap).find(Boolean),
    120,
  );
}

function getMaxmindDbPath() {
  return cleanText(process.env.MAXMIND_CITY_DB_PATH || process.env.GEOIP_CITY_DB_PATH, 500);
}

function getMaxmindReader() {
  if (maxmindLoadAttempted) return maxmindReader;
  maxmindLoadAttempted = true;

  const dbPath = getMaxmindDbPath();
  if (!dbPath) return null;

  try {
    if (!fs.existsSync(dbPath)) {
      if (!maxmindWarned) {
        maxmindWarned = true;
        console.warn(`[ipLocation] MaxMind city database not found: ${dbPath}`);
      }
      return null;
    }
    const database = fs.readFileSync(dbPath);
    maxmindReader = new maxmind.Reader(database);
  } catch (error) {
    if (!maxmindWarned) {
      maxmindWarned = true;
      console.warn('[ipLocation] Failed to open MaxMind city database:', error?.message || error);
    }
    maxmindReader = null;
  }

  return maxmindReader;
}

function mapMaxmindCityRecord(record, ip, ipType) {
  if (!record) return null;
  const countryCode = cleanText(record.country?.iso_code || record.registered_country?.iso_code, 8).toUpperCase();
  const country = pickName(record.country?.names) || formatCountryName(countryCode);
  const regionRecord = Array.isArray(record.subdivisions) ? record.subdivisions[0] : null;
  const region = pickName(regionRecord?.names) || cleanText(regionRecord?.iso_code, 80);
  const city = pickName(record.city?.names);
  const timezone = cleanText(record.location?.time_zone, 80);
  const label = uniqueParts([country, region, city]).join(' / ') || '归属地未知';

  return {
    ip,
    ip_type: ipType,
    country_code: countryCode || null,
    country: country || null,
    region: region || null,
    city: city || null,
    timezone: timezone || null,
    label,
    city_missing_reason: !city ? 'MaxMind 城市库未提供该 IP 的城市级数据' : null,
    source: 'maxmind-geolite2-city',
  };
}

function lookupMaxmindLocation(ip, ipType) {
  const reader = getMaxmindReader();
  if (!reader) return null;
  try {
    return mapMaxmindCityRecord(reader.get(ip), ip, ipType);
  } catch (error) {
    if (!maxmindWarned) {
      maxmindWarned = true;
      console.warn('[ipLocation] MaxMind lookup failed:', error?.message || error);
    }
    return null;
  }
}

function mapGeoipLiteRecord(found, ip, ipType) {
  const countryCode = cleanText(found?.country, 8).toUpperCase();
  const country = formatCountryName(countryCode);
  const region = cleanText(found?.region, 80);
  const city = cleanText(found?.city, 120);
  const label = uniqueParts([country, region, city]).join(' / ') || '归属地未知';

  return {
    ip,
    ip_type: ipType,
    country_code: countryCode || null,
    country: country || null,
    region: region || null,
    city: city || null,
    timezone: cleanText(found?.timezone, 80) || null,
    label,
    city_missing_reason: found && !city ? '当前 IP 库未提供城市级数据' : null,
    source: found ? 'geoip-lite' : 'unknown',
  };
}

function resolveIpLocation(value) {
  const ip = normalizeIpForLookup(value);
  if (!ip) return null;

  const family = net.isIP(ip);
  const ipType = family === 6 ? 'IPv6' : family === 4 ? 'IPv4' : null;
  if (!family) {
    return {
      ip,
      ip_type: null,
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
      ip_type: ipType,
      country_code: null,
      country: null,
      region: null,
      city: null,
      timezone: null,
      label: specialLabel,
      source: 'special',
    };
  }

  return lookupMaxmindLocation(ip, ipType) || mapGeoipLiteRecord(geoip.lookup(ip), ip, ipType);
}

module.exports = {
  mapMaxmindCityRecord,
  normalizeIpForLookup,
  resolveIpLocation,
};
