/**
 * Lightweight CSV helpers (RFC 4180 basics): commas/newlines are wrapped in quotes.
 */

function csvEscape(s) {
  if (s === null || s === undefined) return '';
  const str = String(s);
  if (/[",\r\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

/** @param {string[]} headers @param {Record<string, unknown>[]} rowObjects */
function rowsToCsv(headers, rowObjects) {
  const lines = [headers.map(csvEscape).join(',')];
  for (const row of rowObjects) {
    lines.push(headers.map((h) => csvEscape(row[h])).join(','));
  }
  return lines.join('\r\n');
}

function parseCsvLine(line) {
  const result = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      result.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  result.push(cur);
  return result;
}

/** @returns {{ headers: string[], rows: Record<string, string>[] }} */
function parseCsv(text) {
  const raw = text.replace(/^\uFEFF/, '');
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length);
  if (!lines.length) return { headers: [], rows: [] };
  const headers = parseCsvLine(lines[0]).map((h) => h.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cells = parseCsvLine(lines[i]);
    /** @type {Record<string, string>} */
    const row = {};
    headers.forEach((h, j) => {
      row[h] = cells[j] ?? '';
    });
    rows.push(row);
  }
  return { headers, rows };
}

function hasDecodeProblems(text) {
  // encoding-check: ignore-next-line
  return /�|锟|鍟嗗搧|鍒嗙被|璇勮|璇烽|璇蜂|鏂囦欢|闇€|浼樻儬|銆|锛/.test(text);
}

function decodeCsvBuffer(input) {
  if (!Buffer.isBuffer(input)) return String(input || '');
  if (input.length >= 3 && input[0] === 0xef && input[1] === 0xbb && input[2] === 0xbf) {
    return input.subarray(3).toString('utf8');
  }
  const utf8 = input.toString('utf8');
  if (!hasDecodeProblems(utf8)) return utf8;
  try {
    return new TextDecoder('gb18030').decode(input);
  } catch {
    return utf8;
  }
}

function parseBool(v) {
  const s = String(v).trim().toLowerCase();
  return s === '1' || s === 'true' || s === 'yes';
}

module.exports = {
  csvEscape,
  rowsToCsv,
  parseCsv,
  parseCsvLine,
  parseBool,
  decodeCsvBuffer,
};
