/**
 * Admin CSV column labels.
 */
const { REPORT_COLUMN_LABELS, labelReportColumn } = require('./reportColumnLabels');

const EXTRA_CSV_LABELS = {
  name: '商品名称',
  price: '售价',
  original_price: '划线原价',
  sales_count: '销量',
  stock: '库存',
  unit_name: '库存单位',
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
  tag_names: '标签',
  product_id: '商品编号',
  cost_price: '成本价',
  barcode: '条码',
  variant_enabled: 'SKU启用',
  is_default: '默认SKU',
  variant_sort_order: 'SKU排序',
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
  pending_order_locked_stock: '待支付订单占用',
  pending_order_count: '待支付订单数',
  locked_stock: '锁定库存',
  available_stock: '可售库存',
  stock_warning_threshold: '库存预警值',
  variant_name: '规格名称',
  change_type: '变动类型',
  quantity_delta: '变动数量',
  before_stock: '变更前库存',
  after_stock: '变更后库存',
  source_no: '来源单号',
  operator_name: '操作人',
  user_nickname: '用户昵称',
  user_phone_masked: '用户手机号(脱敏)',
  contact_phone_masked: '联系人电话(脱敏)',
  shipping_phone_masked: '收货电话(脱敏)',
  items_summary: '商品摘要',
  items_count: '商品件数',
  sku_count: 'SKU数',
  payment_channel: '支付渠道',
  payment_transaction_no: '支付交易号',
  paid_at: '支付时间',
  shipped_at: '发货时间',
  return_request_count: '售后单数',
  active_return_count: '售后中数量',
};

/** @type {Record<string, string>} */
const CSV_COLUMN_LABELS = {
  ...REPORT_COLUMN_LABELS,
  ...EXTRA_CSV_LABELS,
  category_id: '分类ID',
  product_id: '商品ID',
  user_id: '用户ID',
  id: '编号',
};

/** @type {Map<string, string>} */
const HEADER_TO_KEY = new Map();
for (const [key, label] of Object.entries(CSV_COLUMN_LABELS)) {
  HEADER_TO_KEY.set(key, key);
  HEADER_TO_KEY.set(label, key);
}
HEADER_TO_KEY.set('价格', 'price');
HEADER_TO_KEY.set('商品ID', 'product_id');
HEADER_TO_KEY.set('SKU价格', 'price');
HEADER_TO_KEY.set('SKU库存', 'stock');

const INVENTORY_CHANGE_LABELS = {
  in: '入库',
  out: '出库',
  adjust: '盘点调整',
  order_deduct: '订单扣减',
  order_release: '订单释放',
  unpack_parent_out: '拆包-大包装减少',
  unpack_child_in: '拆包-小包装增加',
  assemble_child_out: '组装-小包装减少',
  assemble_parent_in: '组装-大包装增加',
  auto_unpack_parent_out: '自动拆包-大包装减少',
  auto_unpack_child_in: '自动拆包-小包装增加',
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
