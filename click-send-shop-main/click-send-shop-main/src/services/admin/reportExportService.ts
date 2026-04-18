/**
 * 报表 CSV 导出：通过后端生成 CSV 并触发浏览器下载。
 * 权限由页面用 PermissionGate + 后端 RBAC（report.export）配合。
 */
import { getAdminAccessToken } from "@/utils/token";

export type ReportExportKind = "sales" | "users" | "products";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

const rangeMap: Record<string, string> = {
  "7d": "week",
  "30d": "month",
  "90d": "quarter",
};

function exportUrl(kind: ReportExportKind, dateRange: string): string {
  const apiRange = rangeMap[dateRange] ?? "month";
  if (kind === "sales") return `${BASE_URL}/admin/reports/sales/export?range=${apiRange}`;
  if (kind === "users") return `${BASE_URL}/admin/reports/users/export?range=${apiRange}`;
  return `${BASE_URL}/admin/reports/products/export`;
}

export async function downloadReportCsv(kind: ReportExportKind, dateRange: string): Promise<{ ok: true } | { ok: false; reason: string }> {
  const token = getAdminAccessToken();
  if (!token) return { ok: false, reason: "未登录" };
  try {
    const res = await fetch(exportUrl(kind, dateRange), {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, reason: text || `导出失败 (${res.status})` };
    }
    const disposition = res.headers.get("Content-Disposition") || "";
    const match = disposition.match(/filename="?([^"]+)"?/);
    const filename = match?.[1] || `${kind}-report.csv`;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return { ok: true };
  } catch {
    return { ok: false, reason: "网络错误" };
  }
}
