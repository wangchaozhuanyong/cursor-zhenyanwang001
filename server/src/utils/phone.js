function toDigits(value) {
  return String(value || '').replace(/\D+/g, '');
}

function normalizeCountryCode(countryCode) {
  const digits = toDigits(countryCode).slice(0, 4);
  return digits || '';
}

function normalizeIntlPhone(phone, countryCode) {
  const raw = String(phone || '').trim();
  const cc = normalizeCountryCode(countryCode);
  const digits = toDigits(raw);

  if (cc) {
    const local = digits.replace(/^0+/, '') || digits;
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
  const normalized = normalizeIntlPhone(raw, countryCode);
  const set = new Set();

  if (raw) set.add(raw);
  if (digits) set.add(digits);
  if (raw.startsWith('+') && digits) set.add(`+${digits}`);
  if (normalized) {
    set.add(normalized);
    if (normalized.startsWith('+')) set.add(normalized.slice(1));
  }

  return [...set];
}

module.exports = {
  normalizeCountryCode,
  normalizeIntlPhone,
  buildPhoneLookupCandidates,
};
