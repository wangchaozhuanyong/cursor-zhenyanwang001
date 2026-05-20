/**
 * 管理端 CSV 列名中文（导出表头 / 导入表头兼容）
 * 与前端 adminDisplayLabels、reportColumnLabels 保持语义一致
 */
const { REPORT_COLUMN_LABELS, labelReportColumn } = require('./reportColumnLabels');

const EXTRA_CSV_LABELS = {
  name: '商品名称',
  price: '售价',
  original_price: '原价',
  sales_count: '销量',
  stock: '库存',
  unit_name: '\u5e93\u5b58\u5355\u4f4d',
  cover_image: '封面图',
  video_url: '视频链接',
  lifecycle_status: '生命周期',
  sort_order: '排序',
  description: '描述',
  points: '积分',
  is_recommended: '是否推荐',
  is_new: '是否新品',
  is_hot: '是否热销',
  images: '图片列表',
  member_level: '会员等级',
  invite_code: '邀请码',
  parent_invite_code: '上级邀请码',
  points_balance: '积分余额',
  wechat: '微信',
  whatsapp: 'WhatsApp',
  tags: '标签',
  order_no: '订单号',
  raw_amount: '原价合计',
  tax_mode: '税费模式',
  tax_rate: '税率',
  tax_label: '税费名称',
  taxable_amount: '应税金额',
  tax_amount: '税费',
  tax_exclusive_amount: '不含税金额',
  total_points: '积分合计',
  contact_name: '联系人',
  contact_phone: '联系电话',
  shipping_phone: '收货电话',
  address: '收货地址',
  shipping_name: '物流公司',
  tracking_no: '运单号',
  carrier: '承运商',
  note: '备注',
  variant_id: '规格编号',
  variant_title: '规格名称',
  sku_code: 'SKU编码',
  reserved_stock: '占用库存',
  available_stock: '可售库存',
  stock_warning_threshold: '库存预警值',
  variant_name: '规格名称',
  change_type: '变动类型',
  quantity_delta: '变动数量',
  before_stock: '变更前库存',
  after_stock: '变更后库存',
  source_no: '来源单号',
  operator_name: '操作人',
};

/** @type {Record<string, string>} */
const CSV_COLUMN_LABELS = {
  ...REPORT_COLUMN_LABELS,
  ...EXTRA_CSV_LABELS,
  // 业务导出专用（避免与报表「分类」等短标签冲突）
  category_id: '分类编号',
  product_id: '商品编号',
  user_id: '用户编号',
  id: '编号',
};

/** @type {Map<string, string>} */
const HEADER_TO_KEY = new Map();
for (const [key, label] of Object.entries(CSV_COLUMN_LABELS)) {
  HEADER_TO_KEY.set(key, key);
  HEADER_TO_KEY.set(label, key);
}
// 常见别名（导入模板兼容）
HEADER_TO_KEY.set('售价', 'price');
HEADER_TO_KEY.set('价格', 'price');

const INVENTORY_CHANGE_LABELS = {
  in: '入库',
  out: '出库',
  adjust: '盘点调整',
  order_deduct: '订单扣减',
  order_release: '订单释放',
  unpack_parent_out: '\u62c6\u5305-\u5927\u5305\u88c5\u51cf\u5c11',
  unpack_child_in: '\u62c6\u5305-\u5c0f\u5305\u88c5\u589e\u52a0',
  assemble_child_out: '\u7ec4\u88c5-\u5c0f\u5305\u88c5\u51cf\u5c11',
  assemble_parent_in: '\u7ec4\u88c5-\u5927\u5305\u88c5\u589e\u52a0',
  auto_unpack_parent_out: '\u81ea\u52a8\u62c6\u5305-\u5927\u5305\u88c5\u51cf\u5c11',
  auto_unpack_child_in: '\u81ea\u52a8\u62c6\u5305-\u5c0f\u5305\u88c5\u589e\u52a0',
};

function labelCsvColumn(key) {
  return CSV_COLUMN_LABELS[key] ?? labelReportColumn(key);
}

/**
 * @param {string[]} columnKeys
 * @param {Record<string, unknown>[]} rowObjects
 */
function rowsToCsvLocalized(columnKeys, rowObjects) {
  const { csvEscape } = require('./csv');
  const headerLabels = columnKeys.map((k) => labelCsvColumn(k));
  const lines = [headerLabels.map(csvEscape).join(',')];
  for (const row of rowObjects) {
    lines.push(columnKeys.map((k) => csvEscape(row[k])).join(','));
  }
  return lines.join('\r\n');
}

/**
 * 将 CSV 解析行（表头可为中文或英文 key）规范为英文字段名
 * @param {Record<string, string>[]} rows
 */
function normalizeCsvImportRows(rows) {
  return rows.map((row) => {
    /** @type {Record<string, string>} */
    const out = {};
    for (const [header, value] of Object.entries(row)) {
      const trimmed = String(header || '').trim();
      const key = HEADER_TO_KEY.get(trimmed) ?? trimmed;
      out[key] = value;
    }
    return out;
  });
}

function labelInventoryChangeType(value) {
  const s = String(value ?? '').trim();
  return INVENTORY_CHANGE_LABELS[s] ?? s;
}

module.exports = {
  CSV_COLUMN_LABELS,
  labelCsvColumn,
  rowsToCsvLocalized,
  normalizeCsvImportRows,
  labelInventoryChangeType,
  INVENTORY_CHANGE_LABELS,
};
