const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const ExcelJS = require('exceljs');
const {
  DEFAULT_VARIANT_TITLE,
  buildVariantTitle,
  groupYinbaoRows,
  parseYinbaoWorkbookBuffer,
} = require('../src/modules/admin/service/yinbaoProductImport');

async function makeYinbaoWorkbookBuffer(rows) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('银豹商品');
  sheet.addRow([
    '名称（必填）',
    '分类（必填）',
    '扩展条码',
    '主编码',
    '规格',
    '主单位',
    '库存量',
    '进货价（必填）',
    '销售价（必填）',
    '毛利率',
    '批发价',
    '库存上限',
    '库存下限',
    '商品状态',
    '创建日期',
  ]);
  for (const row of rows) sheet.addRow(row);
  return workbook.xlsx.writeBuffer();
}

describe('yinbao product Excel import parser', () => {
  test('parses Yinbao rows and keeps barcode columns ignored', async () => {
    const buffer = await makeYinbaoWorkbookBuffer([
      ['同名商品', '分类A', 'EXT-001', 'MAIN-001', '红色', '盒', -2, 3.5, 8.9, '60%', 7, 100, 1, '启用', '2026-06-01'],
      ['同名商品', '分类A', 'EXT-002', 'MAIN-002', '蓝色', '盒', 5, 3.5, 8.9, '60%', 7, 100, 1, '启用', '2026-06-01'],
      ['同名商品', '分类B', 'EXT-003', 'MAIN-003', '', '无', 10, 4, 9.9, '55%', 8, 100, 1, '启用', '2026-06-01'],
      ['另一个商品', '分类A', 'EXT-004', 'MAIN-004', '大', '包', 0, 1.2, 2.5, '50%', 2, 100, 1, '停用', '2026-06-01'],
    ]);

    const parsed = await parseYinbaoWorkbookBuffer(buffer, '商品资料.xlsx');
    assert.equal(parsed.totalRows, 4);
    assert.equal(parsed.rows.length, 4);
    assert.deepEqual(parsed.errors, []);

    assert.equal(parsed.rows[0].variantTitle, '红色 / 盒');
    assert.equal(parsed.rows[0].unitName, '盒');
    assert.equal(parsed.rows[0].stock, -2);
    assert.equal(parsed.rows[2].variantTitle, DEFAULT_VARIANT_TITLE);
    assert.equal(parsed.rows[2].unitName, '');
    assert.equal(parsed.rows[3].status, 'inactive');

    assert.equal(Object.hasOwn(parsed.rows[0], 'barcode'), false);
    assert.equal(Object.hasOwn(parsed.rows[0], 'sku_code'), false);
    assert.equal(Object.hasOwn(parsed.rows[0], '主编码'), false);
    assert.equal(Object.hasOwn(parsed.rows[0], '扩展条码'), false);
  });

  test('groups products by product name plus category name', async () => {
    const buffer = await makeYinbaoWorkbookBuffer([
      ['同名商品', '分类A', 'EXT-001', 'MAIN-001', '红色', '盒', 1, 3, 8, '', '', '', '', '启用', ''],
      ['同名商品', '分类A', 'EXT-002', 'MAIN-002', '蓝色', '盒', 2, 3, 8, '', '', '', '', '启用', ''],
      ['同名商品', '分类B', 'EXT-003', 'MAIN-003', '红色', '盒', 3, 3, 8, '', '', '', '', '启用', ''],
    ]);

    const parsed = await parseYinbaoWorkbookBuffer(buffer, '商品资料.xlsx');
    const groups = groupYinbaoRows(parsed.rows);

    assert.equal(groups.length, 2);
    assert.deepEqual(groups.map((group) => group.categoryName).sort(), ['分类A', '分类B']);
    assert.equal(groups.find((group) => group.categoryName === '分类A').rows.length, 2);
    assert.equal(groups.find((group) => group.categoryName === '分类B').rows.length, 1);
  });

  test('builds a readable variant title from spec and unit', () => {
    assert.equal(buildVariantTitle('500g', '包'), '500g / 包');
    assert.equal(buildVariantTitle('500g', ''), '500g');
    assert.equal(buildVariantTitle('', '包'), '包');
    assert.equal(buildVariantTitle('', '无'), DEFAULT_VARIANT_TITLE);
  });
});
