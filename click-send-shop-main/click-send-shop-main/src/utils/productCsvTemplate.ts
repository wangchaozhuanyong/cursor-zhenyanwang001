/** 与后端 EXPORT_HEADERS_SKU / adminCsvLabels 中文表头一致（一行一 SKU） */
export const PRODUCT_CSV_HEADER_LABELS = [
  "商品编号",
  "商品名称",
  "分类ID",
  "封面图",
  "视频链接",
  "状态",
  "生命周期",
  "排序",
  "描述",
  "积分",
  "销量",
  "是否推荐",
  "是否新品",
  "是否热销",
  "图片列表",
  "标签",
  "规格编号",
  "SKU编码",
  "规格名称",
  "售价",
  "原价",
  "库存",
  "成本价",
  "条码",
  "SKU启用",
  "默认SKU",
  "SKU排序",
  "库存预警值",
] as const;

function csvEscape(value: string) {
  if (/[",\r\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

/** 下载仅含表头的 UTF-8 BOM CSV 模板（ERP 一行一 SKU） */
export function downloadProductCsvTemplate(filename = "products_import_template.csv") {
  const line = PRODUCT_CSV_HEADER_LABELS.map(csvEscape).join(",");
  const blob = new Blob([`\uFEFF${line}\r\n`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
