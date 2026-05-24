function toDigits(value) {
  return String(value || '').replace(/\D+/g, '');
}

function normalizeCountryCode(countryCode) {
  const digits = toDigits(countryCode).slice(0, 4);
  if (digits === '60' || digits === '86') return digits;
  return '';
}

/**
 * 将手机号规范为存储用 E.164（如 +60123456789、+8613800138000）。
 *
 * 修复常见问题：在马/中选择 +60 时，本地用户可能填写「60123456789」（已含 60）、
 * 或「0123456789」。旧逻辑会把前者误存为 +6060123456789，与「123456789」注册出的
 * +60123456789 判为不同号码，导致重复注册、登录匹配不到或 LIMIT 1 命中错误行。
 */
function normalizeIntlPhone(phone, countryCode) {
  const raw = String(phone || '').trim();
  const cc = normalizeCountryCode(countryCode);
  const digits = toDigits(raw);

  if (cc) {
    let local = digits.replace(/^0+/, '') || digits;
    /** 粘贴完整国家码且无 + 的场景：601xxxx / 86138xxxx */
    if (local.startsWith(cc)) {
      local = local.slice(cc.length);
    }
    local = local.replace(/^0+/, '') || local;
    return local ? `+${cc}${local}` : '';
  }

  if (raw.startsWith('+')) {
    return digits ? `+${digits}` : '';
  }

  return digits || raw;
}

function buildPhoneLookupCandidates(phone, countryCode) {
  const raw = String(phone || '').trim();
  const digits = toDigits(raw);
  const canonical = normalizeIntlPhone(raw, countryCode);
  const set = new Set();

  /** 始终以当前规则下的规范号为主锚点，弱化「多格式并存」误判 */
  if (canonical) {
    set.add(canonical);
    if (canonical.startsWith('+')) {
      set.add(canonical.slice(1));
      const canonDigits = toDigits(canonical);
      if (canonDigits) set.add(canonDigits);
    }
  }

  if (raw) set.add(raw);
  if (digits) set.add(digits);
  if (raw.startsWith('+') && digits) set.add(`+${digits}`);

  /** 兼容历史库里未规范化的 Malaysian / China 写法 */
  if (digits) {
    const ccStr = countryCode != null && String(countryCode).trim() ? String(countryCode).trim() : '';
    if (ccStr) {
      const normalizedFallback = normalizeIntlPhone(digits, ccStr);
      if (normalizedFallback) set.add(normalizedFallback);
    }

    if (digits.startsWith('0')) {
      const noLeadingZero = digits.replace(/^0+/, '');
      if (noLeadingZero) {
        set.add(noLeadingZero);
        set.add(`60${noLeadingZero}`);
        set.add(`+60${noLeadingZero}`);
        set.add(`86${noLeadingZero}`);
        set.add(`+86${noLeadingZero}`);
      }
    } else {
      set.add(`0${digits}`);
      if (digits.startsWith('60') || digits.startsWith('86')) {
        const local = digits.slice(2);
        if (local) {
          set.add(local);
          set.add(`0${local}`);
          set.add(`+${digits}`);
        }
      } else {
        set.add(`60${digits}`);
        set.add(`+60${digits}`);
        set.add(`86${digits}`);
        set.add(`+86${digits}`);
      }
    }
  }

  return [...set].filter(Boolean);
}

function normalizePhoneDigitsForCountry(phone, countryCode) {
  const cc = normalizeCountryCode(countryCode);
  let digits = toDigits(phone);
  if (!cc || !digits) return { countryCode: cc, digits };
  if (digits.startsWith(cc)) digits = digits.slice(cc.length);
  digits = digits.replace(/^0+/, '');
  return { countryCode: cc, digits };
}

/** 管理端/未传国家码时，按号码形态推断 +86 / +60 */
function inferCountryCodeForPhone(phone) {
  const digits = toDigits(phone);
  if (!digits) return '';
  if (/^1[3-9]\d{9}$/.test(digits)) return '86';
  if (digits.startsWith('86') && digits.length >= 12) return '86';
  if (digits.startsWith('60') && digits.length >= 10) return '60';
  const local = digits.replace(/^0+/, '') || digits;
  if (/^1\d{8,9}$/.test(local)) return '60';
  return '';
}

function validatePhoneForCountry(phone, countryCode) {
  const { countryCode: cc, digits } = normalizePhoneDigitsForCountry(phone, countryCode);
  if (!cc) return '请选择正确的国家或地区代码';
  if (!digits) return '请填写手机号';
  if (cc === '60' && !/^1\d{8,9}$/.test(digits)) {
    return '马来西亚手机号格式不正确，请输入 9-10 位本地手机号，例如 0123456789';
  }
  if (cc === '86' && !/^1[3-9]\d{9}$/.test(digits)) {
    return '中国手机号格式不正确，请输入 11 位手机号';
  }
  return null;
}

module.exports = {
  normalizeCountryCode,
  normalizeIntlPhone,
  buildPhoneLookupCandidates,
  normalizePhoneDigitsForCountry,
  validatePhoneForCountry,
  inferCountryCodeForPhone,
};
