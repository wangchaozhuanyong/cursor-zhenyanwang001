/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, ClipboardList, Ticket } from "lucide-react";
import { useNavigate } from "react-router-dom";
import SearchBar from "@/components/SearchBar";
import Pagination from "@/components/admin/Pagination";
import { usePagination } from "@/hooks/usePagination";
import { toast } from "sonner";
import * as couponService from "@/services/admin/couponService";
import * as userService from "@/services/admin/userService";
import PermissionGate from "@/components/admin/PermissionGate";
import { toastErrorMessage } from "@/utils/errorMessage";
import { labelCouponStatus, labelCouponType } from "@/utils/adminDisplayLabels";
import { formatAdminDateRange } from "@/utils/formatDateTime";
import { Tx } from "@/components/admin/AdminText";
import { AnimatedConfirmDialog, AnimatedTable } from "@/modules/micro-interactions";
import {
  THEME_BADGE_DANGER,
  THEME_BADGE_MUTED,
  THEME_BADGE_PRICE,
  THEME_BADGE_PRIMARY,
  THEME_BADGE_SUCCESS,
  THEME_OUTLINE_DANGER,
} from "@/utils/themeVisuals";

const typeLabels: Record<string, { label: string; color: string }> = {
  fixed: { label: "满减券", color: THEME_BADGE_DANGER },
  percentage: { label: "折扣券", color: THEME_BADGE_PRIMARY },
  shipping: { label: "运费券", color: THEME_BADGE_PRICE },
};

const statusLabels: Record<string, { label: string; color: string }> = {
  available: { label: "启用", color: THEME_BADGE_SUCCESS },
  expired: { label: "已过期", color: THEME_BADGE_MUTED },
};

export default function AdminCoupons() {
  const navigate = useNavigate();
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [tags, setTags] = useState<Array<{ id: string; name: string }>>([]);
  const [issueCouponId, setIssueCouponId] = useState<string | null>(null);
  const [issueTagId, setIssueTagId] = useState("");

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
    userService.fetchUserTags().then((rows) => setTags(rows.map((t) => ({ id: t.id, name: t.name })))).catch(() => {});
  }, []);

  const handleDelete = (id: string) => {
    couponService.deleteCoupon(id)
      .then(() => { setCoupons(coupons.filter((c) => c.id !== id)); toast.success("已删除"); })
      .catch((e) => toast.error(toastErrorMessage(e, "删除失败")));
  };

  const handleIssueByTag = async (couponId: string, tagIds: string[]) => {
    if (!tagIds.length) return;
    try {
      const r = await couponService.issueCouponByTag(couponId, tagIds);
      toast.success(`发放完成：${r?.issued || 0}/${r?.targetUsers || 0}`);
      setIssueCouponId(null);
      setIssueTagId("");
    } catch (e) {
      toast.error(toastErrorMessage(e, "发放失败"));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground"><Tx>活动管理 / 优惠券管理</Tx></h1>
          <p className="text-sm text-muted-foreground"><Tx>管理优惠券、发放与有效期。</Tx></p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => navigate("/admin/marketing/coupons/records")} className="touch-manipulation flex min-h-[44px] items-center gap-1 rounded-lg border border-border px-3 py-2.5 text-sm text-foreground hover:bg-secondary"><ClipboardList size={14} /><Tx>领券记录</Tx></button>
          <PermissionGate permission="coupon.manage">
            <button type="button" onClick={() => navigate("/admin/marketing/coupons/new")} className="touch-manipulation flex min-h-[44px] items-center gap-1 rounded-lg bg-gold px-4 py-2.5 text-sm font-semibold text-primary-foreground"><Plus size={16} /><Tx>新建优惠券</Tx></button>
          </PermissionGate>
        </div>
      </div>

      <SearchBar placeholder="搜索标题/编码" value={search} onChange={setSearch} />

      <AnimatedTable
        loading={loading}
        rows={paginatedData}
        rowKey={(c) => c.id}
        skeletonRows={8}
        skeletonCols={8}
        tableClassName="min-w-[960px]"
        className="overflow-hidden border-border bg-card"
        theadClassName="bg-secondary/40 text-left text-xs text-muted-foreground"
        thead={(
          <tr>
            <th className="px-4 py-3"><Tx>标题</Tx></th>
            <th className="px-4 py-3"><Tx>类型</Tx></th>
            <th className="px-4 py-3"><Tx>编码</Tx></th>
            <th className="px-4 py-3"><Tx>面额</Tx></th>
            <th className="px-4 py-3"><Tx>门槛</Tx></th>
            <th className="px-4 py-3"><Tx>有效期</Tx></th>
            <th className="px-4 py-3"><Tx>状态</Tx></th>
            <th className="px-4 py-3"><Tx>操作</Tx></th>
          </tr>
        )}
        footer={<Pagination total={total} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />}
        emptyIcon={Ticket}
        emptyTitle="暂无优惠券"
        renderRow={(c) => (
          <>
            <td className="px-4 py-3 font-medium">{c.title}</td>
            <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs ${typeLabels[c.type]?.color || "bg-secondary text-foreground"}`}>{typeLabels[c.type]?.label || labelCouponType(c.type)}</span></td>
            <td className="px-4 py-3 text-xs text-muted-foreground">{c.code}</td>
            <td className="px-4 py-3">{c.value}</td>
            <td className="px-4 py-3">{c.min_amount}</td>
            <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{formatAdminDateRange(c.start_date, c.end_date)}</td>
            <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs ${statusLabels[c.status]?.color || "bg-secondary text-foreground"}`}>{statusLabels[c.status]?.label || labelCouponStatus(c.status)}</span></td>
            <td className="px-4 py-3">
              <div className="flex gap-2">
                <button type="button" onClick={() => navigate(`/admin/marketing/coupons/${c.id}`)} className="rounded-md border border-border p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground" title="编辑"><Pencil size={13} /></button>
                <PermissionGate permission="coupon.manage"><button type="button" onClick={() => setIssueCouponId(c.id)} className="rounded-md border border-border p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground" title="按标签发券">发券</button></PermissionGate>
                <PermissionGate permission="coupon.manage"><button type="button" onClick={() => setDeleteId(c.id)} className={`rounded-md p-1.5 ${THEME_OUTLINE_DANGER}`} title="删除"><Trash2 size={13} /></button></PermissionGate>
              </div>
            </td>
          </>
        )}
      />
      <AnimatedConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        danger
        title="删除优惠券"
        description="确定删除该优惠券？已领取记录将保留。"
        confirmText="删除"
        onConfirm={() => {
          if (!deleteId) return;
          handleDelete(deleteId);
          setDeleteId(null);
        }}
      />
      <AnimatedConfirmDialog
        open={!!issueCouponId}
        onOpenChange={(open) => { if (!open) { setIssueCouponId(null); setIssueTagId(""); } }}
        title="按标签发券"
        description={(
          <div className="space-y-2 text-sm">
            <p>选择一个用户标签，系统将向该标签用户批量发放当前优惠券。</p>
            <select value={issueTagId} onChange={(e) => setIssueTagId(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
              <option value="">请选择标签</option>
              {tags.map((tag) => <option key={tag.id} value={tag.id}>{tag.name}</option>)}
            </select>
          </div>
        ) as any}
        confirmText="确认发放"
        onConfirm={() => {
          if (!issueCouponId || !issueTagId) {
            toast.error("请先选择标签");
            return;
          }
          void handleIssueByTag(issueCouponId, [issueTagId]);
        }}
      />
    </div>
  );
}
