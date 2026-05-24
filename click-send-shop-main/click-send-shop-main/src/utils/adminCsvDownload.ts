import { getAdminAccessToken } from "@/utils/token";
import { runGuardedDownload } from "@/utils/downloadConfirm";
import { triggerBrowserBlobDownload } from "@/utils/fileDownload";

const BASE = import.meta.env.VITE_API_BASE_URL ?? "/api";

/** 下载管理端 CSV（带 Bearer），从 Content-Disposition 取文件名 */
export async function downloadAdminCsv(pathWithQuery: string, fallbackName: string) {
  const fileName = fallbackName;
  const started = await runGuardedDownload(async () => {
    const token = getAdminAccessToken();
    const res = await fetch(`${BASE}${pathWithQuery}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as { message?: string }).message || "导出失败");
    }
    const cd = res.headers.get("Content-Disposition");
    let name = fallbackName;
    if (cd) {
      const m = /filename\*?=(?:UTF-8'')?["']?([^"';]+)/i.exec(cd);
      if (m) {
        try {
          name = decodeURIComponent(m[1]);
        } catch {
          name = m[1];
        }
      }
    }
    const blob = await res.blob();
    await triggerBrowserBlobDownload(blob, name || fallbackName);
  }, {
    title: "确认导出",
    fileName,
    description: `即将导出并下载「${fileName}」，是否继续？`,
    confirmText: "导出并下载",
  });
  if (!started) return;
}
