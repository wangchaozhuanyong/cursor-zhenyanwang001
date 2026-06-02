import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Archive, Ban, ClipboardList, PauseCircle, Pencil, Plus, Trash2, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import SearchBar from "@/components/SearchBar";
import Pagination from "@/components/admin/Pagination";
import { toast } from "sonner";
import * as couponService from "@/services/admin/couponService";
import type { CouponOperation } from "@/services/admin/couponService";
import type { Coupon } from "@/types/coupon";
import * as userService from "@/services/admin/userService";
import PermissionGate from "@/components/admin/PermissionGate";
import { adminQueryKeys } from "@/lib/adminQueryKeys";
import { toastErrorMessage } from "@/utils/errorMessage";
import { formatDateRange } from "@/utils/formatDateTime";
import { Tx } from "@/components/admin/AdminText";
import AdminPageShell from "@/components/admin/AdminPageShell";
import { AdminTableCell } from "@/components/admin/AdminTableCell";
import { AdminTableMobileCard, AdminTableMobileCardField } from "@/components/admin/AdminTableMobileCard";
import { AnimatedConfirmDialog, AnimatedTable } from "@/modules/micro-interactions";
import { AdminEmptyGuideActions } from "@/components/admin/AdminEmptyGuideActions";
import { ADMIN_EMPTY_GUIDES } from "@/config/adminEmptyStateGuides";
import { useAdminTOptional } from "@/hooks/useAdminT";
import { useLocalizedAdminEmptyGuide } from "@/hooks/useLocalizedAdminEmptyGuide";
import { useAdminDisplayLabel } from "@/hooks/useAdminDisplayLabel";
import AdminRowActionsMenu from "@/components/admin/AdminRowActionsMenu";
import { useAdminPermissionStore } from "@/stores/useAdminPermissionStore";
import { THEME_OUTLINE_DANGER } from "@/utils/themeVisuals";
import { adminTableCellClass, adminTableTheadRow, type AdminTableAlign } from "@/utils/adminTableClasses";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

const COUPON_COLUMN_ALIGNS: AdminTableAlign[] = ["left", "center", "left", "right", "right", "left", "center", "right"];

const typeLabels: Record<string, { zh: string; en: string; color: string }> = {
  fixed: { zh: "满减券", en: "Fixed amount", color: "bg-red-100 text-red-700" },
  percentage: { zh: "折扣券", en: "Percentage", color: "bg-blue-100 text-blue-700" },
  shipping: { zh: "运费券", en: "Shipping", color: "bg-amber-100 text-amber-700" },
};

const statusLabels: Record<string, { zh: string; en: string; color: string }> = {
  available: { zh: "启用", en: "Active", color: "bg-green-100 text-green-700" },
  expired: { zh: "已过期", en: "Expired", color: "bg-muted text-muted-foreground" },
};

const couponOperationCopy: Record<CouponOperation, { titleZh: string; titleEn: string; descriptionZh: string; descriptionEn: string; confirmTextZh: string; confirmTextEn: string; successZh: string; successEn: string; danger?: boolean }> = {
  "pause-claim": {
    titleZh: "暂停领取优惠券",
    titleEn: "Pause coupon claim",
    descriptionZh: "只会停止新用户继续领取，已经领到手的优惠券不受影响。",
    descriptionEn: "Only stops new users from claiming it. Claimed coupons are not affected.",
    confirmTextZh: "暂停领取",
    confirmTextEn: "Pause claim",
    successZh: "已暂停领取",
    successEn: "Claim paused",
  },
  "disable-use": {
    titleZh: "停止使用优惠券",
    titleEn: "Disable coupon usage",
    descriptionZh: "会停止这张优惠券继续使用，并作废当前未使用的用户券。",
    descriptionEn: "Stops using this coupon and invalidates the currently unused user coupons.",
    confirmTextZh: "停止使用",
    confirmTextEn: "Disable usage",
    successZh: "已停止使用",
    successEn: "Usage disabled",
    danger: true,
  },
  archive: {
    titleZh: "归档优惠券",
    titleEn: "Archive coupon",
    descriptionZh: "优惠券会从常规列表隐藏，适合下线已结束的运营券。",
    descriptionEn: "Hides the coupon from the main list, suitable for finished campaigns.",
    confirmTextZh: "归档",
    confirmTextEn: "Archive",
    successZh: "已归档",
    successEn: "Archived",
  },
  "invalidate-user-coupons": {
    titleZh: "作废已领取优惠券",
    titleEn: "Invalidate claimed coupons",
    descriptionZh: "会把用户已经领取但还没使用的券作废，已使用记录会保留。",
    descriptionEn: "Invalidates claimed but unused coupons while keeping used records.",
    confirmTextZh: "作废已领券",
    confirmTextEn: "Invalidate",
    successZh: "已作废未使用的用户券",
    successEn: "Unused user coupons invalidated",
    danger: true,
  },
};

export default function AdminCoupons() {
  const { locale } = useAdminTOptional();
  const isEn = locale === "en";
  const L = (zh: string, en: string) => (isEn ? en : zh);
  const { couponType: labelCouponType, couponStatus: labelCouponStatus } = useAdminDisplayLabel();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const can = useAdminPermissionStore((s) => s.can);
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [issueCouponId, setIssueCouponId] = useState<string | null>(null);
  const [issueTagId, setIssueTagId] = useState("");
  const [operation, setOperation] = useState<{ coupon: Coupon; type: CouponOperation } | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const couponFilters = useMemo(
    () => ({
      page,
      pageSize,
      keyword: search.trim() || undefined,
    }),
    [page, pageSize, search],
  );

  const couponsQuery = useQuery({
    queryKey: [...adminQueryKeys.coupons(), couponFilters],
    queryFn: () => couponService.fetchCoupons(couponFilters),
    staleTime: 60_000,
    refetchOnMount: true,
  });

  const tagsQuery = useQuery({
    queryKey: [...adminQueryKeys.usersRoot(), "tags"],
    queryFn: userService.fetchUserTags,
    staleTime: 60_000,
  });

  const coupons = couponsQuery.data?.list ?? [];
  const tags = useMemo(() => (tagsQuery.data ?? []).map((tag) => ({ id: tag.id, name: tag.name })), [tagsQuery.data]);
  const loading = couponsQuery.isLoading && !couponsQuery.data;
  const couponsEmptyGuide = useLocalizedAdminEmptyGuide(ADMIN_EMPTY_GUIDES.coupons);
  const total = couponsQuery.data?.total ?? 0;

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (page > totalPages) setPage(totalPages);
  }, [page, pageSize, total]);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => couponService.deleteCoupon(id),
    onSuccess: async () => {
      toast.success(L("已删除", "Deleted"));
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.couponsRoot() });
    },
    onError: (error) => toast.error(toastErrorMessage(error, L("删除失败", "Delete failed"))),
  });

  const issueMutation = useMutation({
    mutationFn: ({ couponId, tagIds }: { couponId: string; tagIds: string[] }) => couponService.issueCouponByTag(couponId, tagIds),
    onSuccess: async (result) => {
      toast.success(L(`发放完成：${result?.issued || 0}/${result?.targetUsers || 0}`, `Issued: ${result?.issued || 0}/${result?.targetUsers || 0}`));
      setIssueCouponId(null);
      setIssueTagId("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.couponsRoot() }),
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.couponRecordsRoot() }),
      ]);
    },
    onError: (error) => toast.error(toastErrorMessage(error, L("发放失败", "Issue failed"))),
  });

  const operationMutation = useMutation({
    mutationFn: ({ coupon, type }: { coupon: Coupon; type: CouponOperation }) =>
      couponService.operateCoupon(coupon.id, type, L("后台手动作废已领取优惠券", "Invalidate claimed coupons from admin")),
    onSuccess: async (_result, variables) => {
      const copy = couponOperationCopy[variables.type];
      toast.success(L(copy.successZh, copy.successEn));
      setOperation(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.couponsRoot() }),
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.couponRecordsRoot() }),
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.marketingDashboard() }),
      ]);
    },
    onError: (error) => toast.error(toastErrorMessage(error, L("操作失败", "Operation failed"))),
  });

  const renderMobileCard = (coupon: Coupon) => {
    const type = typeLabels[coupon.type] || { zh: labelCouponType(coupon.type), en: labelCouponType(coupon.type), color: "bg-secondary text-foreground" };
    const status = statusLabels[coupon.status] || { zh: labelCouponStatus(coupon.status), en: labelCouponStatus(coupon.status), color: "bg-secondary text-foreground" };

    return (
      <AdminTableMobileCard>
        <div className="mb-2 flex items-start justify-between gap-2">
          <p className="text-sm font-semibold">{coupon.title}</p>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${status.color}`}>{isEn ? status.en : status.zh}</span>
        </div>
        <div className="mb-2 flex flex-wrap gap-1.5">
          <span className={`rounded-full px-2 py-0.5 text-xs ${type.color}`}>{isEn ? type.en : type.zh}</span>
          {coupon.code ? <span className="rounded-full bg-secondary px-2 py-0.5 font-mono text-xs">{coupon.code}</span> : null}
        </div>
        <div className="space-y-2">
          <AdminTableMobileCardField label={L("面额 / 门槛", "Value / min.")}>
            <span className="text-xs text-muted-foreground">{coupon.value} · {L("门槛", "Min.")} {coupon.min_amount}</span>
          </AdminTableMobileCardField>
          <AdminTableMobileCardField label={L("有效期", "Validity")}>
            <span className="text-xs text-muted-foreground">{formatDateRange(coupon.start_date, coupon.end_date)}</span>
          </AdminTableMobileCardField>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
          <UnifiedButton type="button" onClick={() => navigate(`/admin/marketing/coupons/${coupon.id}`)} className="touch-manipulation flex-1 rounded-lg border border-border px-3 py-2 text-xs hover:bg-secondary"><Tx>编辑</Tx></UnifiedButton>
          <PermissionGate permission="coupon.manage">
            <UnifiedButton type="button" onClick={() => setIssueCouponId(coupon.id)} className="touch-manipulation flex-1 rounded-lg border border-border px-3 py-2 text-xs hover:bg-secondary"><Tx>发券</Tx></UnifiedButton>
            <UnifiedButton type="button" onClick={() => setOperation({ coupon, type: "pause-claim" })} className="touch-manipulation rounded-lg border border-border px-3 py-2 text-xs hover:bg-secondary"><PauseCircle size={13} className="mr-1 inline" /><Tx>暂停领取</Tx></UnifiedButton>
            <UnifiedButton type="button" onClick={() => setOperation({ coupon, type: "disable-use" })} className={`touch-manipulation rounded-lg px-3 py-2 text-xs ${THEME_OUTLINE_DANGER}`}><Ban size={13} className="mr-1 inline" /><Tx>停止使用</Tx></UnifiedButton>
            <UnifiedButton type="button" onClick={() => setDeleteId(coupon.id)} className={`touch-manipulation rounded-lg px-3 py-2 text-xs ${THEME_OUTLINE_DANGER}`}><Trash2 size={13} className="inline" /></UnifiedButton>
          </PermissionGate>
        </div>
      </AdminTableMobileCard>
    );
  };

  return (
    <AdminPageShell
      hint={<Tx>管理优惠券、发放与有效期。</Tx>}
      toolbar={(
        <div className="flex flex-wrap gap-2">
          <UnifiedButton type="button" onClick={() => navigate("/admin/marketing/coupons/records")} className="touch-manipulation flex min-h-[44px] items-center gap-1 rounded-lg border border-border px-3 py-2.5 text-sm text-foreground hover:bg-secondary"><ClipboardList size={14} /><Tx>领券记录</Tx></UnifiedButton>
          <PermissionGate permission="coupon.manage">
            <UnifiedButton type="button" onClick={() => navigate("/admin/marketing/coupons/new")} className="touch-manipulation flex min-h-[44px] items-center gap-1 rounded-lg bg-gold px-4 py-2.5 text-sm font-semibold text-primary-foreground"><Plus size={16} /><Tx>新建优惠券</Tx></UnifiedButton>
          </PermissionGate>
        </div>
      )}
      filters={<SearchBar placeholder={L("搜索标题/编码", "Search title/code")} value={search} onChange={(value) => { setSearch(value); setPage(1); }} />}
    >
      <AnimatedTable
        loading={loading}
        rows={coupons}
        rowKey={(coupon) => coupon.id}
        skeletonRows={8}
        skeletonCols={8}
        tableClassName="min-w-[960px]"
        className="overflow-hidden border-border bg-card"
        theadClassName="bg-secondary/40 text-left text-xs text-muted-foreground"
        thead={adminTableTheadRow(
          [L("标题", "Title"), L("类型", "Type"), L("编码", "Code"), L("面额", "Value"), L("门槛", "Min."), L("有效期", "Validity"), L("状态", "Status"), L("操作", "Actions")],
          COUPON_COLUMN_ALIGNS,
          (label) => <Tx>{label}</Tx>,
        )}
        footer={<Pagination total={total} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />}
        emptyIcon={couponsEmptyGuide.icon}
        emptyTitle={couponsEmptyGuide.title}
        emptyDescription={couponsEmptyGuide.description}
        emptyAction={<AdminEmptyGuideActions guide={couponsEmptyGuide} />}
        renderMobileCard={renderMobileCard}
        renderRow={(coupon) => {
          const type = typeLabels[coupon.type] || { zh: labelCouponType(coupon.type), en: labelCouponType(coupon.type), color: "bg-secondary text-foreground" };
          const status = statusLabels[coupon.status] || { zh: labelCouponStatus(coupon.status), en: labelCouponStatus(coupon.status), color: "bg-secondary text-foreground" };
          return (
            <>
              <td className={adminTableCellClass("left", "max-w-[12rem]")}>
                <AdminTableCell value={coupon.title} fullText={coupon.title} maxWidth="11rem" />
              </td>
              <td className={adminTableCellClass("center")}><span className={`rounded-full px-2 py-0.5 text-xs ${type.color}`}>{isEn ? type.en : type.zh}</span></td>
              <td className={adminTableCellClass("left", "text-xs text-muted-foreground")}>{coupon.code}</td>
              <td className={adminTableCellClass("right")}>{coupon.value}</td>
              <td className={adminTableCellClass("right")}>{coupon.min_amount}</td>
              <td className={adminTableCellClass("left", "text-xs whitespace-nowrap text-muted-foreground")}>{formatDateRange(coupon.start_date, coupon.end_date)}</td>
              <td className={adminTableCellClass("center")}><span className={`rounded-full px-2 py-0.5 text-xs ${status.color}`}>{isEn ? status.en : status.zh}</span></td>
              <td className={adminTableCellClass("right")}>
                <AdminRowActionsMenu
                  primary={(
                    <UnifiedButton
                      type="button"
                      onClick={() => navigate(`/admin/marketing/coupons/${coupon.id}`)}
                      className="inline-flex h-8 min-w-[3.25rem] shrink-0 items-center justify-center rounded-md border border-border bg-card px-2.5 text-xs font-medium text-foreground hover:bg-secondary"
                      title={L("编辑", "Edit")}
                    >
                      <Pencil size={13} className="mr-1 inline" />
                      <Tx>编辑</Tx>
                    </UnifiedButton>
                  )}
                  moreLabel={<Tx>更多</Tx>}
                  items={[
                    ...(can("coupon.manage") ? ([
                      { key: "issue", label: <Tx>发券</Tx>, onClick: () => setIssueCouponId(coupon.id) },
                      { key: "pause-claim", label: <Tx>暂停领取</Tx>, icon: <PauseCircle size={14} aria-hidden />, onClick: () => setOperation({ coupon, type: "pause-claim" }) },
                      { key: "disable-use", label: <Tx>停止使用</Tx>, icon: <Ban size={14} aria-hidden />, danger: true, onClick: () => setOperation({ coupon, type: "disable-use" }) },
                      { key: "archive", label: <Tx>归档</Tx>, icon: <Archive size={14} aria-hidden />, onClick: () => setOperation({ coupon, type: "archive" }) },
                      { key: "invalidate-user-coupons", label: <Tx>作废已领券</Tx>, icon: <XCircle size={14} aria-hidden />, danger: true, onClick: () => setOperation({ coupon, type: "invalidate-user-coupons" }) },
                      { key: "delete", label: <Tx>删除</Tx>, icon: <Trash2 size={14} aria-hidden />, danger: true, separatorBefore: true, onClick: () => setDeleteId(coupon.id) },
                    ] as const) : []),
                  ]}
                />
              </td>
            </>
          );
        }}
      />

      <AnimatedConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        danger
        title={L("删除优惠券", "Delete coupon")}
        description={L("确定删除该优惠券？已领取记录将保留。", "Delete this coupon? Claimed records will be kept.")}
        confirmText={L("删除", "Delete")}
        onConfirm={() => {
          if (!deleteId) return;
          deleteMutation.mutate(deleteId);
          setDeleteId(null);
        }}
      />

      <AnimatedConfirmDialog
        open={!!operation}
        onOpenChange={(open) => !open && setOperation(null)}
        danger={operation ? couponOperationCopy[operation.type].danger : false}
        title={operation ? L(couponOperationCopy[operation.type].titleZh, couponOperationCopy[operation.type].titleEn) : ""}
        description={operation ? L(couponOperationCopy[operation.type].descriptionZh, couponOperationCopy[operation.type].descriptionEn) : ""}
        confirmText={operation ? L(couponOperationCopy[operation.type].confirmTextZh, couponOperationCopy[operation.type].confirmTextEn) : ""}
        onConfirm={() => {
          if (!operation) return;
          operationMutation.mutate(operation);
        }}
      />

      <AnimatedConfirmDialog
        open={!!issueCouponId}
        onOpenChange={(open) => { if (!open) { setIssueCouponId(null); setIssueTagId(""); } }}
        title={L("按标签发券", "Issue by tag")}
        description={(
          <div className="space-y-2 text-sm">
            <p><Tx>选择一个用户标签，系统将向该标签用户批量发放当前优惠券。</Tx></p>
            <select value={issueTagId} onChange={(e) => setIssueTagId(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
              <option value="">{L("请选择标签", "Select a tag")}</option>
              {tags.map((tag) => <option key={tag.id} value={tag.id}>{tag.name}</option>)}
            </select>
          </div>
        ) as ReactNode}
        confirmText={L("确认发放", "Confirm")}
        onConfirm={() => {
          if (!issueCouponId || !issueTagId) {
            toast.error(L("请先选择标签", "Please select a tag first"));
            return;
          }
          issueMutation.mutate({ couponId: issueCouponId, tagIds: [issueTagId] });
        }}
      />
    </AdminPageShell>
  );
}
