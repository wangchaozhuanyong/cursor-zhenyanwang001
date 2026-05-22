const { klDateString } = require('./klDateRange');

function parseYmd(value) {
  if (!value) return null;
  if (value instanceof Date) return klDateString(value);
  const s = String(value).trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

function ymdToUtcDate(ymd) {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function addDaysYmd(ymd, days) {
  const dt = ymdToUtcDate(ymd);
  dt.setUTCDate(dt.getUTCDate() + days);
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const d = String(dt.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Check if todayYmd falls within [birthday - beforeDays, birthday + afterDays] in KL calendar year.
 */
function isInBirthdayWindow(todayYmd, birthday, beforeDays = 0, afterDays = 0) {
  const today = parseYmd(todayYmd) || klDateString();
  const bd = parseYmd(birthday);
  if (!bd) return false;
  const before = Math.max(0, Math.trunc(Number(beforeDays) || 0));
  const after = Math.max(0, Math.trunc(Number(afterDays) || 0));
  const year = today.slice(0, 4);
  const anchor = `${year}-${bd.slice(5)}`;
  const start = addDaysYmd(anchor, -before);
  const end = addDaysYmd(anchor, after);
  if (start <= end) return today >= start && today <= end;
  return today >= start || today <= end;
}

function klYear(date = new Date()) {
  return klDateString(date).slice(0, 4);
}

module.exports = {
  parseYmd,
  isInBirthdayWindow,
  klYear,
};
