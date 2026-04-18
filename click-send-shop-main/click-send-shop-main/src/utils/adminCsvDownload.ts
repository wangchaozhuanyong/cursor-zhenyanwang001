import { getAdminAccessToken } from "@/utils/token";

const BASE = import.meta.env.VITE_API_BASE_URL ?? "/api";

/** 下载管理端 CSV（带 Bearer），从 Content-Disposition 取文件名 */
export async function downloadAdminCsv(pathWithQuery: string, fallbackName: string) {
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
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name || fallbackName;
  a.click();
  URL.revokeObjectURL(url);
}
