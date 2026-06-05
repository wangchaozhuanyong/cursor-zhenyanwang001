const ExcelJS = require('exceljs');

const DEFAULT_VARIANT_TITLE = '默认规格';
const MAX_YINBAO_IMPORT_ROWS = 5000;

const HEADER_ALIASES = {
  name: ['名称（必填）', '名称', '商品名称'],
  categoryName: ['分类（必填）', '分类', '商品分类'],
  spec: ['规格', '规格名称'],
  unitName: ['主单位', '单位', '库存单位'],
  stock: ['库存量', '库存', 'SKU库存'],
  costPrice: ['进货价（必填）', '进货价', '成本价'],
  price: ['销售价（必填）', '销售价', '售价'],
  status: ['商品状态', '状态'],
};

function normalizeHeader(value) {
  return String(value || '')
    .replace(/^\uFEFF/, '')
    .replace(/\s+/g, '')
    .trim();
}

function normalizeKey(value) {
  return String(value || '').trim().toLowerCase();
}

function cellToText(value) {
  if (value == null) return '';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') {
    if (value.text != null) return String(value.text);
    if (value.result != null) return cellToText(value.result);
    if (Array.isArray(value.richText)) return value.richText.map((part) => part.text || '').join('');
    if (value.hyperlink && value.text) return String(value.text);
  }
  return String(value);
}

function cleanText(value, max = 255) {
  return cellToText(value).trim().slice(0, max);
}

function parseNumber(value) {
  const text = cleanText(value)
    .replace(/[,\s]/g, '')
    .replace(/^RM/i, '')
    .replace(/%$/, '');
  if (!text) return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

function parseInteger(value) {
  const n = parseNumber(value);
  if (n == null) return null;
  return Math.trunc(n);
}

function normalizeUnitName(value) {
  const text = cleanText(value, 32);
  if (!text || text === '无') return '';
  return text;
}

function buildVariantTitle(specRaw, unitRaw) {
  const spec = cleanText(specRaw, 64);
  const unit = normalizeUnitName(unitRaw);
  if (spec && unit) return `${spec} / ${unit}`;
  if (spec) return spec;
  if (unit) return unit;
  return DEFAULT_VARIANT_TITLE;
}

function normalizeStatus(value) {
  const text = cleanText(value).toLowerCase();
  if (!text || text === '启用' || text === 'active' || text === '上架') return 'active';
  if (text === '草稿' || text === 'draft') return 'draft';
  if (text.includes('停') || text.includes('禁') || text.includes('下架') || text === 'inactive') return 'inactive';
  return 'active';
}

function indexHeaders(headerRow) {
  const normalized = new Map();
  headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    const header = normalizeHeader(cellToText(cell.value));
    if (header) normalized.set(header, colNumber);
  });

  const indexes = {};
  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    const found = aliases.map(normalizeHeader).find((alias) => normalized.has(alias));
    if (found) indexes[field] = normalized.get(found);
  }
  return {
    indexes,
    headers: [...normalized.keys()],
  };
}

function findHeaderRow(sheet) {
  let best = null;
  sheet.eachRow((row, rowNumber) => {
    if (best) return;
    const { indexes } = indexHeaders(row);
    const score = Object.keys(indexes).length;
    if (score >= 5 && indexes.name && indexes.categoryName && indexes.price) {
      best = { row, rowNumber, indexes };
    }
  });
  return best;
}

function getCell(row, index) {
  return index ? row.getCell(index).value : '';
}

function parseYinbaoRow(row, rowNumber, indexes) {
  const name = cleanText(getCell(row, indexes.name));
  const categoryName = cleanText(getCell(row, indexes.categoryName), 100);
  const price = parseNumber(getCell(row, indexes.price));
  const costPrice = parseNumber(getCell(row, indexes.costPrice));
  const stock = parseInteger(getCell(row, indexes.stock));
  const unitName = normalizeUnitName(getCell(row, indexes.unitName));
  const variantTitle = buildVariantTitle(getCell(row, indexes.spec), getCell(row, indexes.unitName));
  const status = normalizeStatus(getCell(row, indexes.status));

  const reasons = [];
  if (!name) reasons.push('缺少商品名称');
  if (!categoryName) reasons.push('缺少分类名称');
  if (price == null) reasons.push('销售价格格式无效');
  if (costPrice == null) reasons.push('进货价格格式无效');
  if (stock == null) reasons.push('库存格式无效');

  if (reasons.length) {
    return {
      error: {
        row: rowNumber,
        reason: reasons.join('；'),
      },
    };
  }

  return {
    row: {
      rowNumber,
      name,
      categoryName,
      variantTitle,
      unitName,
      stock,
      price,
      costPrice,
      status,
    },
  };
}

function isBlankDataRow(row, indexes) {
  return ['name', 'categoryName', 'price', 'stock'].every((field) => !cleanText(getCell(row, indexes[field])));
}

async function parseYinbaoWorkbookBuffer(buffer, filename = '') {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer);
  } catch {
    return { rows: [], errors: [{ row: 0, reason: 'Excel 文件无法读取，请上传 .xlsx 格式' }], totalRows: 0, filename };
  }
  const sheet = workbook.worksheets[0];
  if (!sheet) {
    return { rows: [], errors: [{ row: 0, reason: 'Excel 内没有可读取的工作表' }], totalRows: 0, filename };
  }

  const header = findHeaderRow(sheet);
  if (!header) {
    return { rows: [], errors: [{ row: 0, reason: '未识别到银豹商品表头' }], totalRows: 0, filename, sheetName: sheet.name };
  }

  const rows = [];
  const errors = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber <= header.rowNumber) return;
    if (isBlankDataRow(row, header.indexes)) return;
    const parsed = parseYinbaoRow(row, rowNumber, header.indexes);
    if (parsed.error) errors.push(parsed.error);
    else rows.push(parsed.row);
  });

  if (rows.length > MAX_YINBAO_IMPORT_ROWS) {
    errors.push({ row: 0, reason: `单次最多导入 ${MAX_YINBAO_IMPORT_ROWS} 行银豹商品` });
  }

  return {
    rows,
    errors,
    totalRows: rows.length + errors.filter((item) => item.row > 0).length,
    filename,
    sheetName: sheet.name,
  };
}

function groupYinbaoRows(rows) {
  const groups = new Map();
  for (const row of rows) {
    const key = `${normalizeKey(row.name)}\u001f${normalizeKey(row.categoryName)}`;
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        name: row.name,
        categoryName: row.categoryName,
        rows: [],
      });
    }
    groups.get(key).rows.push(row);
  }
  return [...groups.values()];
}

function makeNameCategoryKey(name, categoryId) {
  return `${normalizeKey(name)}\u001f${String(categoryId || '').trim()}`;
}

function isYinbaoExcelFile(file) {
  const name = String(file?.originalname || file?.name || '').toLowerCase();
  return name.endsWith('.xlsx') || name.endsWith('.xls');
}

module.exports = {
  DEFAULT_VARIANT_TITLE,
  MAX_YINBAO_IMPORT_ROWS,
  buildVariantTitle,
  groupYinbaoRows,
  isYinbaoExcelFile,
  makeNameCategoryKey,
  normalizeKey,
  parseYinbaoWorkbookBuffer,
};
