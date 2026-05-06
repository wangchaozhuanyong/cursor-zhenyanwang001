import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, ClipboardList, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import SearchBar from "@/components/SearchBar";
import Pagination from "@/components/admin/Pagination";
import { usePagination } from "@/hooks/usePagination";
import { toast } from "sonner";
import * as couponService from "@/services/admin/couponService";
import PermissionGate from "@/components/admin/PermissionGate";
import { toastErrorMessage } from "@/utils/errorMessage";

const typeLabels: Record<string, { label: string; color: string }> = {
  fixed: { label: "满减券", color: "bg-red-500/10 text-red-500" },
  percentage: { label: "折扣券", color: "bg-blue-500/10 text-blue-500" },
  shipping: { label: "运费券", color: "bg-cyan-500/10 text-cyan-500" },
};

const statusLabels: Record<string, { label: string; color: string }> = {
  available: { label: "启用", color: "bg-green-500/10 text-green-500" },
  expired: { label: "已过期", color: "bg-muted text-muted-foreground" },
};

export default function AdminCoupons() {
  const navigate = useNavigate();
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const filteredCoupons = coupons.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.title?.toLowerCase().includes(q) || c.code?.toLowerCase().includes(q);
  });
  const { page, pageSize, setPage, setPageSize, paginatedData, total } = usePagination(filteredCoupons, 10);

  useEffect(() => {
    couponService.fetchCoupons()
      .then((p) => setCoupons(p.list))
      .catch((e) => toast.error(toastErrorMessage(e, "加载数据失败")))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = (id: string) => {
    couponService.deleteCoupon(id)
      .then(() => {
        setCoupons(coupons.filter((c) => c.id !== id));
        toast.success("已删除");
      })
      .catch((e) => toast.error(toastErrorMessage(e, "删除失败")));
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="min-w-0 flex-1"><SearchBar placeholder="搜索优惠券名称..." value={search} onChange={(v) => { setSearch(v); setPage(1); }} /></div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <PermissionGate permission="coupon.view">
            <button type="button" onClick={() => navigate("/admin/coupons/records")} className="touch-manipulation flex min-h-[44px] items-center gap-1 rounded-lg border border-border px-3 py-2.5 text-sm text-foreground hover:bg-secondary"><ClipboardList size={14} /> 领券记录</button>
          </PermissionGate>
          <PermissionGate permission="coupon.manage">
            <button type="button" onClick={() => navigate("/admin/coupons/new")} className="touch-manipulation flex min-h-[44px] items-center gap-1 rounded-lg bg-gold px-4 py-2.5 text-sm font-semibold text-primary-foreground"><Plus size={16} /> 新建优惠券</button>
          </PermissionGate>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {[
          { label: "总优惠券数", value: String(coupons.length) },
          { label: "启用中", value: String(coupons.filter((c) => c.status === "available").length) },
          { label: "已过期", value: String(coupons.filter((c) => c.status === "expired").length) },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4 text-center">
            <p className="text-lg font-bold text-foreground">{s.value}</p>
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* 移动端：卡片 */}
      <div className="space-y-3 md:hidden">
        {paginatedData.map((c) => {
          const t = typeLabels[c.type] ?? { label: c.type, color: "bg-muted text-muted-foreground" };
          const st = statusLabels[c.status] ?? { label: c.status, color: "bg-muted text-muted-foreground" };
          return (
            <div key={c.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-foreground">{c.title}</p>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${st.color}`}>{st.label}</span>
              </div>
              <p className="mt-1 font-mono text-xs text-muted-foreground">{c.code}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${t.color}`}>{t.label}</span>
                <span className="text-sm text-foreground">{c.type === "percentage" ? `${c.value}%` : `RM ${c.value}`}</span>
                <span className="text-xs text-muted-foreground">满 RM {c.min_amount}</span>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">{c.start_date?.slice(0, 10)} ~ {c.end_date?.slice(0, 10)}</p>
              <div className="mt-3 flex gap-2">
                <PermissionGate permission="coupon.manage">
                  <button type="button" onClick={() => navigate(`/admin/coupons/${c.id}`)} className="touch-manipulation min-h-[44px] flex-1 rounded-lg border border-border py-2 text-sm font-medium active:bg-secondary">编辑</button>
                </PermissionGate>
                <PermissionGate permission="coupon.manage">
                  <button type="button" onClick={() => handleDelete(c.id)} className="touch-manipulation min-h-[44px] flex-1 rounded-lg border border-destructive/30 py-2 text-sm text-destructive active:bg-destructive/10">删除</button>
                </PermissionGate>
              </div>
            </div>
          );
        })}
        {paginatedData.length === 0 && (
          <div className="py-12 text-center text-sm text-muted-foreground">暂无优惠券</div>
        )}
        <Pagination total={total} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
      </div>

      {/* 桌面端：表格 */}
      <div className="hidden overflow-x-auto rounded-xl border border-border bg-card md:block">
        <table className="w-full min-w-[880px] text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              {["券名称", "编码", "类型", "优惠值", "最低消费", "有效期", "状态", "操作"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((c) => {
              const t = typeLabels[c.type] ?? { label: c.type, color: "bg-muted text-muted-foreground" };
              const st = statusLabels[c.status] ?? { label: c.status, color: "bg-muted text-muted-foreground" };
              return (
                <tr key={c.id} className="border-b border-border last:border-0 hover:bg-secondary/30">
                  <td className="px-4 py-3 font-medium text-foreground">{c.title}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{c.code}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${t.color}`}>{t.label}</span></td>
                  <td className="px-4 py-3 text-foreground">{c.type === "percentage" ? `${c.value}%` : `RM ${c.value}`}</td>
                  <td className="px-4 py-3 text-foreground">RM {c.min_amount}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{c.start_date?.slice(0, 10)} ~ {c.end_date?.slice(0, 10)}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${st.color}`}>{st.label}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      <PermissionGate permission="coupon.manage">
                        <button type="button" onClick={() => navigate(`/admin/coupons/${c.id}`)} className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground" title="编辑"><Pencil size={13} /></button>
                      </PermissionGate>
                      <PermissionGate permission="coupon.manage">
                        <button type="button" onClick={() => handleDelete(c.id)} className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" title="删除"><Trash2 size={13} /></button>
                      </PermissionGate>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <Pagination total={total} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
      </div>
    </div>
  );
}
