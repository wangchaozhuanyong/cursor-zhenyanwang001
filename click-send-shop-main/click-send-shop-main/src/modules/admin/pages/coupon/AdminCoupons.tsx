import { useMemo, useState, type ReactNode } from "react";
import { Plus, Pencil, Trash2, ClipboardList } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import SearchBar from "@/components/SearchBar";
import Pagination from "@/components/admin/Pagination";
import { usePagination } from "@/hooks/usePagination";
import { toast } from "sonner";
import * as couponService from "@/services/admin/couponService";
import type { Coupon } from "@/types/coupon";
import * as userService from "@/services/admin/userService";
import PermissionGate from "@/components/admin/PermissionGate";
import { adminQueryKeys } from "@/lib/adminQueryKeys";
import { toastErrorMessage } from "@/utils/errorMessage";
import { formatAdminDateRange } from "@/utils/formatDateTime";
import { Tx } from "@/components/admin/AdminText";
import { AdminPageTitle } from "@/components/admin/AdminFieldHint";
import { AdminTableCell } from "@/components/admin/AdminTableCell";
import { AnimatedConfirmDialog, AnimatedTable } from "@/modules/micro-interactions";
import { AdminEmptyGuideActions } from "@/components/admin/AdminEmptyGuideActions";
import { ADMIN_EMPTY_GUIDES } from "@/config/adminEmptyStateGuides";
import { useAdminT } from "@/hooks/useAdminT";
import { useAdminDisplayLabel } from "@/hooks/useAdminDisplayLabel";
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
  const { tText } = useAdminT();
  const { couponType: labelCouponType, couponStatus: labelCouponStatus, text: L } = useAdminDisplayLabel();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [issueCouponId, setIssueCouponId] = useState<string | null>(null);
  const [issueTagId, setIssueTagId] = useState("");

  const couponsQuery = useQuery({
    queryKey: adminQueryKeys.coupons(),
    queryFn: () => couponService.fetchCoupons(),
    staleTime: 60_000,
  });

  const tagsQuery = useQuery({
    queryKey: [...adminQueryKeys.usersRoot(), "tags"],
    queryFn: userService.fetchUserTags,
    staleTime: 60_000,
  });

  const coupons = couponsQuery.data?.list ?? [];
  const tags = useMemo(
    () => (tagsQuery.data ?? []).map((tag) => ({ id: tag.id, name: tag.name })),
    [tagsQuery.data],
  );
  const loading = couponsQuery.isLoading && !couponsQuery.data;

  const filteredCoupons = coupons.filter((coupon) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return coupon.title?.toLowerCase().includes(q) || coupon.code?.toLowerCase().includes(q);
  });
  const { page, pageSize, setPage, setPageSize, paginatedData, total } = usePagination(filteredCoupons, 10);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => couponService.deleteCoupon(id),
    onSuccess: async () => {
      toast.success(tText("已删除"));
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.couponsRoot() });
    },
    onError: (error) => toast.error(toastErrorMessage(error, "删除失败")),
  });

  const issueMutation = useMutation({
    mutationFn: ({ couponId, tagIds }: { couponId: string; tagIds: string[] }) => couponService.issueCouponByTag(couponId, tagIds),
    onSuccess: (result) => {
      toast.success(`发放完成：${result?.issued || 0}/${result?.targetUsers || 0}`);
      setIssueCouponId(null);
      setIssueTagId("");
    },
    onError: (error) => toast.error(toastErrorMessage(error, "发放失败")),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <AdminPageTitle
            title={<Tx>活动管理 / 优惠券管理</Tx>}
            hint={<Tx>管理优惠券、发放与有效期。</Tx>}
          />
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => navigate("/admin/marketing/coupons/records")} className="touch-manipulation flex min-h-[44px] items-center gap-1 rounded-lg border border-border px-3 py-2.5 text-sm text-foreground hover:bg-secondary"><ClipboardList size={14} /><Tx>领券记录</Tx></button>
          <PermissionGate permission="coupon.manage">
            <button type="button" onClick={() => navigate("/admin/marketing/coupons/new")} className="touch-manipulation flex min-h-[44px] items-center gap-1 rounded-lg bg-gold px-4 py-2.5 text-sm font-semibold text-primary-foreground"><Plus size={16} /><Tx>新建优惠券</Tx></button>
          </PermissionGate>
        </div>
      </div>

      <SearchBar placeholder={tText("搜索标题/编码")} value={search} onChange={setSearch} />

      <AnimatedTable
        loading={loading}
        rows={paginatedData}
        rowKey={(coupon) => coupon.id}
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
        emptyIcon={ADMIN_EMPTY_GUIDES.coupons.icon}
        emptyTitle={ADMIN_EMPTY_GUIDES.coupons.title}
        emptyDescription={ADMIN_EMPTY_GUIDES.coupons.description}
        emptyAction={<AdminEmptyGuideActions guide={ADMIN_EMPTY_GUIDES.coupons} />}
        renderRow={(coupon) => (
          <>
            <td className="max-w-[12rem] px-4 py-3 align-middle">
              <AdminTableCell value={coupon.title} fullText={coupon.title} maxWidth="11rem" />
            </td>
            <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs ${typeLabels[coupon.type]?.color || "bg-secondary text-foreground"}`}>{typeLabels[coupon.type]?.label ? L(typeLabels[coupon.type].label) : labelCouponType(coupon.type)}</span></td>
            <td className="px-4 py-3 text-xs text-muted-foreground">{coupon.code}</td>
            <td className="px-4 py-3">{coupon.value}</td>
            <td className="px-4 py-3">{coupon.min_amount}</td>
            <td className="px-4 py-3 text-xs whitespace-nowrap text-muted-foreground">{formatAdminDateRange(coupon.start_date, coupon.end_date)}</td>
            <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs ${statusLabels[coupon.status]?.color || "bg-secondary text-foreground"}`}>{statusLabels[coupon.status]?.label ? L(statusLabels[coupon.status].label) : labelCouponStatus(coupon.status)}</span></td>
            <td className="px-4 py-3">
              <div className="flex gap-2">
                <button type="button" onClick={() => navigate(`/admin/marketing/coupons/${coupon.id}`)} className="rounded-md border border-border p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground" title={tText("编辑")}><Pencil size={13} /></button>
                <PermissionGate permission="coupon.manage"><button type="button" onClick={() => setIssueCouponId(coupon.id)} className="rounded-md border border-border p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground" title={tText("按标签发券")}><Tx>发券</Tx></button></PermissionGate>
                <PermissionGate permission="coupon.manage"><button type="button" onClick={() => setDeleteId(coupon.id)} className={`rounded-md p-1.5 ${THEME_OUTLINE_DANGER}`} title={tText("删除")}><Trash2 size={13} /></button></PermissionGate>
              </div>
            </td>
          </>
        )}
      />
      <AnimatedConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        danger
        title={tText("删除优惠券")}
        description="确定删除该优惠券？已领取记录将保留。"
        confirmText="删除"
        onConfirm={() => {
          if (!deleteId) return;
          deleteMutation.mutate(deleteId);
          setDeleteId(null);
        }}
      />
      <AnimatedConfirmDialog
        open={!!issueCouponId}
        onOpenChange={(open) => { if (!open) { setIssueCouponId(null); setIssueTagId(""); } }}
        title={tText("按标签发券")}
        description={(
          <div className="space-y-2 text-sm">
            <p><Tx>选择一个用户标签，系统将向该标签用户批量发放当前优惠券。</Tx></p>
            <select value={issueTagId} onChange={(e) => setIssueTagId(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
              <option value=""><Tx>请选择标签</Tx></option>
              {tags.map((tag) => <option key={tag.id} value={tag.id}>{tag.name}</option>)}
            </select>
          </div>
        ) as ReactNode}
        confirmText="确认发放"
        onConfirm={() => {
          if (!issueCouponId || !issueTagId) {
            toast.error(tText("请先选择标签"));
            return;
          }
          issueMutation.mutate({ couponId: issueCouponId, tagIds: [issueTagId] });
        }}
      />
    </div>
  );
}
