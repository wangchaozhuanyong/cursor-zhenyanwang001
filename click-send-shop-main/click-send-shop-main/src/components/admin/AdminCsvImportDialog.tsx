import { useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { AdminResponsiveSheet } from "@/modules/admin/components/AdminResponsiveSheet";
import type { ProductImportResult } from "@/types/product";
import { useAdminTOptional } from "@/hooks/useAdminT";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  onImport: (file: File) => Promise<ProductImportResult>;
  onSuccess?: (result: ProductImportResult) => void;
  extraHints?: string[];
};

export default function AdminCsvImportDialog({
  open,
  onOpenChange,
  title,
  description,
  onImport,
  onSuccess,
  extraHints = [],
}: Props) {
  const { locale } = useAdminTOptional();
  const isEn = locale === "en";
  const L = (zh: string, en: string) => (isEn ? en : zh);
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [lastResult, setLastResult] = useState<ProductImportResult | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const effectiveTitle = title ?? L("批量导入", "Bulk import");
  const effectiveDescription = description ?? L("上传 UTF-8 编码的 CSV 文件。表头可使用中文或英文字段名。", "Upload a UTF-8 CSV file. Headers can use Chinese or English field names.");

  const resetState = () => {
    setFile(null);
    setLastResult(null);
    setErrorText(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleOpenChange = (next: boolean) => {
    if (!next && !importing) resetState();
    onOpenChange(next);
  };

  const handleImport = async () => {
    if (!file) {
      setErrorText(L("请选择 CSV 文件", "Please select a CSV file"));
      return;
    }
    setImporting(true);
    setErrorText(null);
    setLastResult(null);
    try {
      const result = await onImport(file);
      setLastResult(result);
      onSuccess?.(result);
    } catch (err) {
      setErrorText(err instanceof Error ? err.message : L("导入失败", "Import failed"));
    } finally {
      setImporting(false);
    }
  };

  const footer = (
    <div className="grid grid-cols-2 gap-2">
      <button
        type="button"
        disabled={importing}
        onClick={() => handleOpenChange(false)}
        className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border px-4 py-2 text-sm font-medium transition hover:bg-secondary disabled:opacity-60"
      >
        {lastResult ? L("关闭", "Close") : L("取消", "Cancel")}
      </button>
      <button
        type="button"
        disabled={importing || !file}
        onClick={() => void handleImport()}
        className="inline-flex min-h-11 items-center justify-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
      >
        {importing ? <Loader2 size={14} className="animate-spin" /> : null}
        {importing ? L("导入中…", "Importing...") : L("开始导入", "Start import")}
      </button>
    </div>
  );

  return (
    <AdminResponsiveSheet
      open={open}
      onOpenChange={handleOpenChange}
      title={effectiveTitle}
      description={effectiveDescription}
      footer={footer}
      size="md"
      stickyFooter
    >
      <div className="space-y-3 text-sm text-muted-foreground">
        <ul className="list-disc space-y-1 pl-5">
          <li>{L("ERP 模式：同一商品多行，每行一个 SKU（商品名称、售价必填）", "ERP mode: multiple rows per product, one SKU per row (product name and price are required)")}</li>
          <li>{L("填写商品编号则更新；留空则按商品名称归组新建", "Fill in the product ID to update; leave it blank to group by product name and create a new one")}</li>
          <li>{L("标签：中文名，逗号分隔；SKU 编码可匹配已有规格", "Tags: Chinese names separated by commas; SKU codes can match existing variants")}</li>
          <li>{L("状态填 active / draft / inactive", "Status should be active / draft / inactive")}</li>
          {extraHints.map((hint) => (
            <li key={hint}>{hint}</li>
          ))}
        </ul>

        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-secondary/30 px-4 py-8 transition hover:bg-secondary/50">
          <Upload size={20} className="text-muted-foreground" />
          <span className="font-medium text-foreground">{file ? file.name : L("点击选择 CSV 文件", "Click to choose a CSV file")}</span>
          <span className="text-xs text-muted-foreground">{L("最大 5MB", "Max 5MB")}</span>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            disabled={importing}
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setErrorText(null);
              setLastResult(null);
            }}
          />
        </label>

        {errorText ? (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-destructive">{errorText}</p>
        ) : null}

        {lastResult ? (
          <div className="rounded-lg border border-border bg-card px-3 py-2 text-foreground">
            <p>
              {lastResult.mode === "sku_matrix" ? L("SKU 矩阵模式", "SKU matrix mode") : L("经典模式", "Classic mode")}
              {lastResult.sku_rows ? ` · ${L("同步", "Synced")} ${lastResult.sku_rows} ${L("个 SKU", "SKUs")}` : ""}
            </p>
            <p>
              {L("新建", "Created")} {lastResult.created} {L("条", "items")}, {L("更新", "Updated")} {lastResult.updated} {L("条", "items")}
              {lastResult.skipped ? `, ${L("跳过", "Skipped")} ${lastResult.skipped} ${L("条", "items")}` : ""}
            </p>
            {lastResult.errors?.length ? (
              <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto text-xs text-muted-foreground">
                {lastResult.errors.slice(0, 10).map((item) => (
                  <li key={`${item.row}-${item.reason}`}>
                    {isEn ? `Row ${item.row}${item.reason ? `: ${item.reason}` : ""}` : `第 ${item.row} 行${item.reason ? `：${item.reason}` : ""}`}
                  </li>
                ))}
                {lastResult.errors.length > 10 ? (
                  <li>{L("…另有", "... and")} {lastResult.errors.length - 10} {L("条错误", "more errors")}</li>
                ) : null}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>
    </AdminResponsiveSheet>
  );
}
