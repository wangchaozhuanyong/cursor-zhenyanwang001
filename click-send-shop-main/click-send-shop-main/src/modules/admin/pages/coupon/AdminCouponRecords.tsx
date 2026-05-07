import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import SearchBar from "@/components/SearchBar";
import Pagination from "@/components/admin/Pagination";
import { usePagination } from "@/hooks/usePagination";
import { toast } from "sonner";
import { fetchCouponRecords } from "@/services/admin/couponService";

const statusLabels: Record<string, { label: string; color: string }> = {
  available: { label: "未使用", color: "bg-gold/10 text-gold" },
  used: { label: "已使用", color: "bg-green-500/10 text-green-500" },
  expired: { label: "已过期", color: "bg-muted text-muted-foreground" },
};

export default function AdminCouponRecords() {
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchCouponRecords()
      .then((p) => setRecords(p.list))
      .catch(() => toast.error("加载领券记录失败"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = records.filter((r) => {
    if (statusFilter && r.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (r.nickname || "").toLowerCase().includes(q)
        || (r.phone || "").toLowerCase().includes(q)
        || (r.coupon_title || "").toLowerCase().includes(q);
    }
    return true;
  });
  const { page, pageSize, setPage, setPageSize, paginatedData, total } = usePagination(filtered, 10);

  const formatPhone = (phone: string | null | undefined) => {
    if (!phone) return "—";
    const raw = String(phone).trim();
    if (raw.length < 7) return raw;
    return `${raw.slice(0, 3)}****${raw.slice(-4)}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3"><h2 className="text-lg font-semibold text-foreground">领券记录</h2></div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="min-w-0 flex-1"><SearchBar placeholder="搜索用户/优惠券..." value={search} onChange={(v) => { setSearch(v); setPage(1); }} /></div>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="min-h-[44px] w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none sm:w-auto">
          <option value="">全部状态</option>
          <option value="available">未使用</option>
          <option value="used">已使用</option>
          <option value="expired">已过期</option>
        </select>
      </div>

      <div className="space-y-3 md:hidden">
        {paginatedData.map((r) => {
          const st = statusLabels[r.status] ?? { label: r.status, color: "" };
          return (
            <div key={r.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-foreground">{r.coupon_title || r.coupon_id?.slice(0, 12) || "—"}</p>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${st.color}`}>{st.label}</span>
              </div>
              <p className="mt-2 text-sm text-foreground">{r.nickname || r.user_id?.slice(0, 12) || "—"}</p>
              <p className="mt-1 text-xs text-muted-foreground">手机号：{formatPhone(r.phone)}</p>
              <p className="mt-2 text-[11px] text-muted-foreground">领取 {r.claimed_at ? new Date(r.claimed_at).toLocaleString("zh-CN") : "—"}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">使用 {r.used_at ? new Date(r.used_at).toLocaleString("zh-CN") : "—"}</p>
            </div>
          );
        })}
        {paginatedData.length === 0 && (
          <div className="py-12 text-center text-sm text-muted-foreground">无匹配记录</div>
        )}
        <Pagination total={total} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
      </div>

      <div className="hidden overflow-x-auto rounded-xl border border-border bg-card md:block">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              {["用户", "手机号", "优惠券", "领取时间", "状态", "使用时间"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((r) => {
              const st = statusLabels[r.status] ?? { label: r.status, color: "" };
              return (
                <tr key={r.id} className="border-b border-border last:border-0 hover:bg-secondary/30">
                  <td className="px-4 py-3 text-foreground">{r.nickname || r.user_id?.slice(0, 12) || "—"}</td>
                  <td className="px-4 py-3 text-foreground">{formatPhone(r.phone)}</td>
                  <td className="px-4 py-3 text-foreground">{r.coupon_title || r.coupon_id?.slice(0, 12) || "—"}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{r.claimed_at ? new Date(r.claimed_at).toLocaleString("zh-CN") : "—"}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${st.color}`}>{st.label}</span></td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{r.used_at ? new Date(r.used_at).toLocaleString("zh-CN") : "—"}</td>
                </tr>
              );
            })}
            {paginatedData.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">无匹配记录</td></tr>
            )}
          </tbody>
        </table>
        <Pagination total={total} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
      </div>
    </div>
  );
}
