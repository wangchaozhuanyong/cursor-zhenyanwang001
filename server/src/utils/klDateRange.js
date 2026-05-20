/** UTC+8 / Asia-Kuala_Lumpur day boundaries for admin stats (aligned with reports). */
const TZ = 'Asia/Kuala_Lumpur';

function klDateString(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(date);
}

function parseYmd(ymd) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ymd || '').trim());
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return Number.isNaN(d.getTime()) ? null : d;
}

function addDaysUtc(utcDate, days) {
  const d = new Date(utcDate);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function resolveKLDateRange(query = {}) {
  const todayYmd = klDateString();
  const todayUtc = parseYmd(todayYmd);
  let dateFrom = todayYmd;
  let dateTo = todayYmd;
  const preset = String(query.range_preset || query.preset || 'last_7_days').trim();

  if (preset === 'today') {
    // defaults
  } else if (preset === 'yesterday' && todayUtc) {
    const y = addDaysUtc(todayUtc, -1);
    dateFrom = klDateString(y);
    dateTo = dateFrom;
  } else if (preset === 'last_7_days' && todayUtc) {
    dateFrom = klDateString(addDaysUtc(todayUtc, -6));
    dateTo = todayYmd;
  } else if (preset === 'last_30_days' && todayUtc) {
    dateFrom = klDateString(addDaysUtc(todayUtc, -29));
    dateTo = todayYmd;
  } else if (preset === 'this_month' && todayUtc) {
    dateFrom = `${todayYmd.slice(0, 7)}-01`;
    dateTo = todayYmd;
  } else if (preset === 'custom') {
    const from = String(query.date_from || '').trim();
    const to = String(query.date_to || '').trim();
    if (parseYmd(from)) dateFrom = from;
    if (parseYmd(to)) dateTo = to;
    if (dateFrom > dateTo) {
      const swap = dateFrom;
      dateFrom = dateTo;
      dateTo = swap;
    }
  } else if (todayUtc) {
    dateFrom = klDateString(addDaysUtc(todayUtc, -6));
    dateTo = todayYmd;
  }

  return { dateFrom, dateTo, preset, todayYmd };
}

function enumerateDates(dateFrom, dateTo) {
  const start = parseYmd(dateFrom);
  const end = parseYmd(dateTo);
  if (!start || !end) return [];
  const out = [];
  for (let cur = start; cur <= end; cur = addDaysUtc(cur, 1)) {
    out.push(klDateString(cur));
  }
  return out;
}

function fillDailySeries(rows, dateFrom, dateTo, mapRow, emptyRow) {
  const byDate = new Map();
  for (const row of rows || []) {
    const key = row.date instanceof Date
      ? klDateString(row.date)
      : String(row.date || '').slice(0, 10);
    if (key) byDate.set(key, mapRow(row, key));
  }
  return enumerateDates(dateFrom, dateTo).map((d) => byDate.get(d) || emptyRow(d));
}

function formatChartLabel(ymd) {
  const s = String(ymd || '');
  return s.length >= 10 ? s.slice(5, 10) : s;
}

/** SQL expression: KL calendar date from a timestamp column */
function klDateSql(column) {
  return `DATE(DATE_ADD(${column}, INTERVAL 8 HOUR))`;
}

module.exports = {
  TZ,
  klDateString,
  resolveKLDateRange,
  enumerateDates,
  fillDailySeries,
  formatChartLabel,
  klDateSql,
};
