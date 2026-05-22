import { useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ProductImportResult } from "@/types/product";

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
  title = "批量导入",
  description = "上传 UTF-8 编码的 CSV 文件。表头可使用中文或英文字段名。",
  onImport,
  onSuccess,
  extraHints = [],
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [lastResult, setLastResult] = useState<ProductImportResult | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

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
      setErrorText("请选择 CSV 文件");
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
      setErrorText(err instanceof Error ? err.message : "导入失败");
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm text-muted-foreground">
          <ul className="list-disc space-y-1 pl-5">
            <li>ERP 模式：同一商品多行，每行一个 SKU（商品名称、售价必填）</li>
            <li>填写商品编号则更新；留空则按商品名称归组新建</li>
            <li>标签：中文名，逗号分隔；SKU 编码可匹配已有规格</li>
            <li>状态填 active / draft / inactive</li>
            {extraHints.map((hint) => (
              <li key={hint}>{hint}</li>
            ))}
          </ul>

          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-secondary/30 px-4 py-8 transition hover:bg-secondary/50">
            <Upload size={20} className="text-muted-foreground" />
            <span className="font-medium text-foreground">{file ? file.name : "点击选择 CSV 文件"}</span>
            <span className="text-xs text-muted-foreground">最大 5MB</span>
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
                新建 {lastResult.created} 条，更新 {lastResult.updated} 条
                {lastResult.skipped ? `，跳过 ${lastResult.skipped} 条` : ""}
              </p>
              {lastResult.errors?.length ? (
                <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto text-xs text-muted-foreground">
                  {lastResult.errors.slice(0, 10).map((item) => (
                    <li key={`${item.row}-${item.reason}`}>
                      第 {item.row} 行：{item.reason}
                    </li>
                  ))}
                  {lastResult.errors.length > 10 ? (
                    <li>…另有 {lastResult.errors.length - 10} 条错误</li>
                  ) : null}
                </ul>
              ) : null}
            </div>
          ) : null}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <button
            type="button"
            disabled={importing}
            onClick={() => handleOpenChange(false)}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition hover:bg-secondary disabled:opacity-60"
          >
            {lastResult ? "关闭" : "取消"}
          </button>
          <button
            type="button"
            disabled={importing || !file}
            onClick={() => void handleImport()}
            className="inline-flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
          >
            {importing ? <Loader2 size={14} className="animate-spin" /> : null}
            {importing ? "导入中…" : "开始导入"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
