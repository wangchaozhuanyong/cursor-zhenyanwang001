import { useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { AdminResponsiveSheet } from "@/modules/admin/components/AdminResponsiveSheet";
import type { ProductImportPreview, ProductImportResult } from "@/types/product";
import { useAdminTOptional } from "@/hooks/useAdminT";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  accept?: string;
  onPreview?: (file: File) => Promise<ProductImportPreview>;
  onImport: (file: File) => Promise<ProductImportResult>;
  onSuccess?: (result: ProductImportResult) => void;
  extraHints?: string[];
};

const DEFAULT_ACCEPT = ".csv,text/csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function SummaryPill({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border bg-secondary/40 px-3 py-2">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-semibold text-foreground">{value}</div>
    </div>
  );
}

export default function AdminCsvImportDialog({
  open,
  onOpenChange,
  title,
  description,
  accept = DEFAULT_ACCEPT,
  onPreview,
  onImport,
  onSuccess,
  extraHints = [],
}: Props) {
  const { locale } = useAdminTOptional();
  const isEn = locale === "en";
  const L = (zh: string, en: string) => (isEn ? en : zh);
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ProductImportPreview | null>(null);
  const [importing, setImporting] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [lastResult, setLastResult] = useState<ProductImportResult | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  const effectiveTitle = title ?? L("批量导入", "Bulk import");
  const effectiveDescription = description ?? L(
    "支持系统 CSV 模板和银豹 .xlsx 商品表；银豹表会先解析预览，确认后才写入。",
    "Supports the system CSV template and Yinbao .xlsx product files. Yinbao files are previewed before import.",
  );

  const resetState = () => {
    setFile(null);
    setPreview(null);
    setLastResult(null);
    setErrorText(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleOpenChange = (next: boolean) => {
    if (!next && !importing && !previewing) resetState();
    onOpenChange(next);
  };

  const handlePreview = async () => {
    if (!file) {
      setErrorText(L("请先选择导入文件", "Please select an import file"));
      return;
    }
    if (!onPreview) return;
    setPreviewing(true);
    setErrorText(null);
    setLastResult(null);
    try {
      const result = await onPreview(file);
      setPreview(result);
    } catch (err) {
      setPreview(null);
      setErrorText(err instanceof Error ? err.message : L("预览失败", "Preview failed"));
    } finally {
      setPreviewing(false);
    }
  };

  const handleImport = async () => {
    if (!file) {
      setErrorText(L("请先选择导入文件", "Please select an import file"));
      return;
    }
    if (onPreview && !preview) {
      await handlePreview();
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

  const busy = importing || previewing;
  const footer = (
    <div className="grid grid-cols-2 gap-2">
      <UnifiedButton
        type="button"
        disabled={busy}
        onClick={() => handleOpenChange(false)}
        className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border px-4 py-2 text-sm font-medium transition hover:bg-secondary disabled:opacity-60"
      >
        {lastResult ? L("关闭", "Close") : L("取消", "Cancel")}
      </UnifiedButton>
      {onPreview && !preview && !lastResult ? (
        <UnifiedButton
          type="button"
          disabled={busy || !file}
          onClick={() => void handlePreview()}
          className="inline-flex min-h-11 items-center justify-center gap-1 rounded-lg bg-[var(--theme-price)] px-4 py-2 text-sm font-semibold text-[var(--theme-price-foreground)] transition hover:opacity-90 disabled:opacity-60"
        >
          {previewing ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />}
          {previewing ? L("解析中...", "Previewing...") : L("解析预览", "Preview")}
        </UnifiedButton>
      ) : (
        <UnifiedButton
          type="button"
          disabled={busy || !file || !!lastResult}
          onClick={() => void handleImport()}
          className="inline-flex min-h-11 items-center justify-center gap-1 rounded-lg bg-[var(--theme-price)] px-4 py-2 text-sm font-semibold text-[var(--theme-price-foreground)] transition hover:opacity-90 disabled:opacity-60"
        >
          {importing ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          {importing ? L("导入中...", "Importing...") : L("确认导入", "Confirm import")}
        </UnifiedButton>
      )}
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
          <li>{L("银豹 Excel 会按“商品名 + 分类”分组，同一商品的每一行作为一个 SKU。", "Yinbao Excel rows are grouped by product name and category; each row becomes one SKU.")}</li>
          <li>{L("分类按名称匹配；不存在的分类会走后台分类逻辑自动创建。", "Categories are matched by name; missing categories are created through the admin category flow.")}</li>
          <li>{L("条码字段会完全忽略，不写入 SKU，也不参与匹配。", "Barcode fields are ignored and are not used for matching.")}</li>
          <li>{L("负库存会按银豹账面数保留。", "Negative stock is kept as exported from Yinbao.")}</li>
          {extraHints.map((hint) => (
            <li key={hint}>{hint}</li>
          ))}
        </ul>

        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-secondary/30 px-4 py-8 transition hover:bg-secondary/50">
          <Upload size={20} className="text-muted-foreground" />
          <span className="font-medium text-foreground">{file ? file.name : L("点击选择 CSV 或银豹 Excel", "Click to choose CSV or Yinbao Excel")}</span>
          <span className="text-xs text-muted-foreground">{L("最大 5MB，支持 .csv / .xlsx", "Max 5MB, supports .csv / .xlsx")}</span>
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            className="sr-only"
            disabled={busy}
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setPreview(null);
              setErrorText(null);
              setLastResult(null);
            }}
          />
        </label>

        {errorText ? (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-destructive">{errorText}</p>
        ) : null}

        {preview ? (
          <div className="space-y-3 rounded-lg border border-border bg-card px-3 py-3 text-foreground">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <CheckCircle2 size={16} className="text-emerald-600" />
              {preview.mode === "yinbao_excel" ? L("银豹 Excel 预览", "Yinbao Excel preview") : L("CSV 预览", "CSV preview")}
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <SummaryPill label={L("有效行", "Valid rows")} value={preview.valid_rows} />
              <SummaryPill label="SKU" value={preview.sku_rows} />
              <SummaryPill label={L("新建商品", "New products")} value={preview.products_to_create} />
              <SummaryPill label={L("更新商品", "Updated products")} value={preview.products_to_update} />
            </div>
            {preview.categories_to_create.length ? (
              <p className="text-xs text-muted-foreground">
                {L("将自动创建分类：", "Categories to create: ")}
                <span className="font-medium text-foreground">{preview.categories_to_create.join("、")}</span>
              </p>
            ) : null}
            {preview.negative_stock_rows ? (
              <p className="flex items-start gap-2 rounded-lg border border-amber-300/40 bg-amber-100/40 px-3 py-2 text-xs text-amber-800">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                {L(`检测到 ${preview.negative_stock_rows} 行负库存，确认后会保留。`, `${preview.negative_stock_rows} negative-stock rows will be kept.`)}
              </p>
            ) : null}
            {preview.ignored_columns?.length ? (
              <p className="text-xs text-muted-foreground">
                {L("本次忽略字段：", "Ignored fields: ")}{preview.ignored_columns.join("、")}
              </p>
            ) : null}
            {preview.errors?.length ? (
              <ul className="max-h-32 space-y-1 overflow-y-auto rounded-lg bg-secondary/30 px-3 py-2 text-xs text-muted-foreground">
                {preview.errors.slice(0, 10).map((item) => (
                  <li key={`${item.row}-${item.reason}`}>{L(`第 ${item.row} 行：${item.reason}`, `Row ${item.row}: ${item.reason}`)}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        {lastResult ? (
          <div className="rounded-lg border border-border bg-card px-3 py-2 text-foreground">
            <p className="font-semibold">{lastResult.mode === "yinbao_excel" ? L("银豹导入完成", "Yinbao import complete") : L("导入完成", "Import complete")}</p>
            <p className="mt-1 text-sm">
              {L("新建", "Created")} {lastResult.created}，{L("更新", "Updated")} {lastResult.updated}
              {lastResult.sku_rows ? `，SKU ${lastResult.sku_rows}` : ""}
              {lastResult.skipped ? `，${L("跳过", "Skipped")} ${lastResult.skipped}` : ""}
            </p>
            {lastResult.categories_created?.length ? (
              <p className="mt-1 text-xs text-muted-foreground">{L("新建分类：", "Created categories: ")}{lastResult.categories_created.join("、")}</p>
            ) : null}
            {lastResult.errors?.length ? (
              <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto text-xs text-muted-foreground">
                {lastResult.errors.slice(0, 10).map((item) => (
                  <li key={`${item.row}-${item.reason}`}>{L(`第 ${item.row} 行：${item.reason}`, `Row ${item.row}: ${item.reason}`)}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>
    </AdminResponsiveSheet>
  );
}
