import { useState } from "react";
import { CheckCircle2, UploadCloud, XCircle } from "lucide-react";
import { useGoBack } from "@/hooks/useGoBack";
import * as uploadService from "@/services/uploadService";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";

type VerifyResult = {
  url: string;
  host: string;
  isS3: boolean;
  mode: "s3" | "any";
};

export default function UploadVerify() {
  const goBack = useGoBack("/settings");
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<VerifyResult | null>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const data = await uploadService.uploadSingle(file);
      const status = uploadService.getUploadStorageStatus(data.url, data.storageProvider);
      const next: VerifyResult = {
        url: data.url,
        host: status.host,
        isS3: status.isS3,
        mode: status.mode,
      };
      setResult(next);
      toast.success(`上传成功：${next.host}`);
    } catch (error) {
      setResult(null);
      toast.error(error instanceof Error ? error.message : "上传失败");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  return (
    <div className="min-h-screen bg-[var(--theme-bg)] text-[var(--theme-text)]">
      <PageHeader title="上传验收" onBack={goBack} />

      <main className="mx-auto w-full px-[var(--store-page-x)] py-4 sm:max-w-lg sm:px-4 sm:py-6">
        <div className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5 theme-shadow">
          <label className="mb-3 block text-sm font-medium text-foreground">选择一张图片进行上传验证</label>
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--theme-border)] bg-secondary/30 px-4 py-6 text-sm text-foreground hover:bg-secondary/50">
            <UploadCloud size={18} />
            <span>{uploading ? "上传中..." : "点击选择图片"}</span>
            <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" disabled={uploading} />
          </label>
          <p className="mt-3 text-xs text-muted-foreground">
            当前策略：{result?.mode ?? "s3"}。启用预签名上传时请设置 `VITE_UPLOAD_PRESIGN=1`。
          </p>
        </div>

        {result && (
          <div className="mt-4 theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5 theme-shadow">
            <div className="flex items-center gap-2">
              {result.isS3 ? (
                <CheckCircle2 size={18} className="text-[var(--theme-success)]" />
              ) : (
                <XCircle size={18} className="text-[var(--theme-danger)]" />
              )}
              <span className="text-sm font-semibold text-foreground">
                {result.isS3 ? "S3 校验通过" : "S3 校验失败"}
              </span>
            </div>
            <div className="mt-3 space-y-2 text-xs">
              <div className="rounded-lg bg-secondary px-3 py-2 text-foreground">Host: {result.host || "(empty)"}</div>
              <div className="rounded-lg bg-secondary px-3 py-2 break-all text-foreground">URL: {result.url}</div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
