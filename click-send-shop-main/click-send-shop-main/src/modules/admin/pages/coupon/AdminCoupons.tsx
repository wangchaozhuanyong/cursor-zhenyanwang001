/* eslint-disable @typescript-eslint/no-explicit-any */
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
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-gold" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">活动管理 / 优惠券管理</h1>
          <p className="text-sm text-muted-foreground">管理优惠券、发放与有效期。</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => navigate("/admin/marketing/coupons/records")} className="touch-manipulation flex min-h-[44px] items-center gap-1 rounded-lg border border-border px-3 py-2.5 text-sm text-foreground hover:bg-secondary"><ClipboardList size={14} />领券记录</button>
          <PermissionGate permission="coupon.manage">
            <button type="button" onClick={() => navigate("/admin/marketing/coupons/new")} className="touch-manipulation flex min-h-[44px] items-center gap-1 rounded-lg bg-gold px-4 py-2.5 text-sm font-semibold text-primary-foreground"><Plus size={16} />新建优惠券</button>
          </PermissionGate>
        </div>
      </div>

      <SearchBar placeholder="搜索标题/编码" value={search} onChange={setSearch} />

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full min-w-[960px] text-sm">
          <thead className="bg-secondary/40 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-3">标题</th>
              <th className="px-4 py-3">类型</th>
              <th className="px-4 py-3">编码</th>
              <th className="px-4 py-3">面值</th>
              <th className="px-4 py-3">门槛</th>
              <th className="px-4 py-3">有效期</th>
              <th className="px-4 py-3">状态</th>
              <th className="px-4 py-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-muted-foreground">暂无优惠券</td></tr>
            ) : paginatedData.map((c) => (
              <tr key={c.id} className="border-t border-border">
                <td className="px-4 py-3 font-medium">{c.title}</td>
                <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs ${typeLabels[c.type]?.color || "bg-secondary text-foreground"}`}>{typeLabels[c.type]?.label || c.type}</span></td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{c.code}</td>
                <td className="px-4 py-3">{c.value}</td>
                <td className="px-4 py-3">{c.min_amount}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{c.start_date} ~ {c.end_date}</td>
                <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs ${statusLabels[c.status]?.color || "bg-secondary text-foreground"}`}>{statusLabels[c.status]?.label || c.status}</span></td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button type="button" onClick={() => navigate(`/admin/marketing/coupons/${c.id}`)} className="rounded-md border border-border p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground" title="编辑"><Pencil size={13} /></button>
                    <PermissionGate permission="coupon.manage"><button type="button" onClick={() => handleDelete(c.id)} className="rounded-md border border-destructive/40 p-1.5 text-destructive hover:bg-destructive/10" title="删除"><Trash2 size={13} /></button></PermissionGate>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination total={total} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
      </div>
    </div>
  );
}
