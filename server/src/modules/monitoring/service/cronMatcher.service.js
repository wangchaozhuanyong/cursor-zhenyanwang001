function parseNumber(token, min, max) {
  const n = Number(token);
  if (!Number.isInteger(n) || n < min || n > max) return null;
  return n;
}

function matchPart(part, value, min, max) {
  let step = 1;
  let base = part;
  if (part.includes('/')) {
    const slash = part.lastIndexOf('/');
    base = part.slice(0, slash);
    step = parseInt(part.slice(slash + 1), 10);
    if (!step || step < 1) return false;
  }

  if (base === '*') {
    if (step === 1) return true;
    return (value - min) % step === 0;
  }

  if (base.includes('-')) {
    const [startToken, endToken] = base.split('-', 2);
    const start = parseNumber(startToken, min, max);
    const end = parseNumber(endToken, min, max);
    if (start == null || end == null || start > end) return false;
    for (let current = start; current <= end; current += step) {
      if (current === value) return true;
    }
    return false;
  }

  const single = parseNumber(base, min, max);
  if (single != null) return single === value;
  return false;
}

function matchField(field, value, min, max) {
  const trimmed = String(field || '').trim();
  if (!trimmed) return false;
  return trimmed.split(',').some((part) => matchPart(part.trim(), value, min, max));
}

function matchDayOfWeek(field, dayOfWeek) {
  if (matchField(field, dayOfWeek, 0, 6)) return true;
  if (dayOfWeek === 0 && matchField(field, 7, 0, 7)) return true;
  return false;
}

/**
 * Match standard 5-field cron: minute hour day-of-month month day-of-week
 * @param {string} cronExpression
 * @param {Date} [date]
 */
function matches(cronExpression, date = new Date()) {
  const parts = String(cronExpression || '').trim().split(/\s+/);
  if (parts.length !== 5) return false;
  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return false;

  return (
    matchField(minute, d.getMinutes(), 0, 59)
    && matchField(hour, d.getHours(), 0, 23)
    && matchField(dayOfMonth, d.getDate(), 1, 31)
    && matchField(month, d.getMonth() + 1, 1, 12)
    && matchDayOfWeek(dayOfWeek, d.getDay())
  );
}

function isValidExpression(cronExpression) {
  const parts = String(cronExpression || '').trim().split(/\s+/);
  return parts.length === 5 && parts.every((part) => part.length > 0);
}

module.exports = {
  matches,
  isValidExpression,
  matchField,
};
