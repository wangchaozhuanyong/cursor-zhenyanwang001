const KL_OFFSET_HOURS = 8;
const KL_OFFSET_MS = KL_OFFSET_HOURS * 60 * 60 * 1000;

function partsFromDateObject(date) {
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hour: date.getUTCHours(),
    minute: date.getUTCMinutes(),
    second: date.getUTCSeconds(),
  };
}

function parseDateTimeParts(value, mode = 'exact') {
  if (!value) return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return partsFromDateObject(value);
  }

  const raw = String(value).trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/.exec(raw);
  if (!match) return null;

  const hasTime = match[4] != null;
  const endOfDay = mode === 'endOfDay' && !hasTime;
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: hasTime ? Number(match[4]) : (endOfDay ? 23 : 0),
    minute: hasTime ? Number(match[5]) : (endOfDay ? 59 : 0),
    second: hasTime ? Number(match[6] || 0) : (endOfDay ? 59 : 0),
  };
}

function klDateTimeOrNull(value, mode = 'exact') {
  const parts = parseDateTimeParts(value, mode);
  if (!parts) return null;
  const utcMs = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour - KL_OFFSET_HOURS,
    parts.minute,
    parts.second,
  );
  const d = new Date(utcMs);
  return Number.isNaN(d.getTime()) ? null : d;
}

function mysqlUtcDateTime(value) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

function klDateTimeSql(expression) {
  return `DATE_SUB(${expression}, INTERVAL ${KL_OFFSET_HOURS} HOUR)`;
}

module.exports = {
  KL_OFFSET_HOURS,
  KL_OFFSET_MS,
  klDateTimeOrNull,
  mysqlUtcDateTime,
  klDateTimeSql,
};
