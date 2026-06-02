import { useMemo, useState } from "react";
import { ClipboardList, Gift, Pencil, Plus, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import AdminPageShell from "@/components/admin/AdminPageShell";
import Pagination from "@/components/admin/Pagination";
import PermissionGate from "@/components/admin/PermissionGate";
import SearchBar from "@/components/SearchBar";
import { AnimatedConfirmDialog, AnimatedTable } from "@/modules/micro-interactions";
import { AdminTableCell } from "@/components/admin/AdminTableCell";
import { adminTableTheadRow, type AdminTableAlign } from "@/utils/adminTableClasses";
import { adminQueryKeys } from "@/lib/adminQueryKeys";
import { formatDateRange } from "@/utils/formatDateTime";
import { toastErrorMessage } from "@/utils/errorMessage";
import * as campaignService from "@/services/admin/couponCampaignService";
import type { CouponCampaign, CouponCampaignStatus, CouponCampaignType } from "@/types/couponCampaign";

const columnAligns: AdminTableAlign[] = ["left", "center", "center", "center", "right", "left", "right"];

const typeLabels: Record<CouponCampaignType, string> = {
  public_claim: "公开领券",
  new_user_gift: "新人礼包",
  member: "会员专享",
  user_tag: "标签人群",
  code: "兑换码",
  seasonal: "节日活动",
  compensation: "补偿发券",
};

const statusLabels: Record<CouponCampaignStatus, string> = {
  draft: "草稿",
  scheduled: "未开始",
  active: "进行中",
  ended: "已结束",
  disabled: "已停用",
};

const statusClass: Record<CouponCampaignStatus, string> = {
  draft: "bg-secondary text-muted-foreground",
  scheduled: "bg-blue-50 text-blue-700",
  active: "bg-green-50 text-green-700",
  ended: "bg-muted text-muted-foreground",
  disabled: "bg-red-50 text-red-700",
};

export default function AdminCouponCampaigns() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [keyword, setKeyword] = useState("");
  const [campaignType, setCampaignType] = useState<CouponCampaignType | "">("");
  const [status, setStatus] = useState<CouponCampaignStatus | "">("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filters = useMemo(() => ({
    page,
    pageSize,
    keyword: keyword.trim() || undefined,
    campaign_type: campaignType || undefined,
    status: status || undefined,
  }), [campaignType, keyword, page, pageSize, status]);

  const campaignsQuery = useQuery({
    queryKey: adminQueryKeys.couponCampaigns(filters),
    queryFn: () => campaignService.fetchCouponCampaigns(filters),
    staleTime: 60_000,
    placeholderData: (previous) => previous,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => campaignService.deleteCouponCampaign(id),
    onSuccess: async () => {
      toast.success("已删除优惠券活动");
      setDeleteId(null);
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.couponCampaignsRoot() });
    },
    onError: (error) => toast.error(toastErrorMessage(error, "删除失败")),
  });

  const campaigns = campaignsQuery.data?.list ?? [];
  const total = campaignsQuery.data?.total ?? 0;
  const loading = campaignsQuery.isLoading && !campaignsQuery.data;

  const renderStatus = (campaign: CouponCampaign) => {
    const key = campaign.status || "draft";
    return (
      <span className={`rounded-full px-2 py-0.5 text-xs ${statusClass[key] || statusClass.draft}`}>
        {statusLabels[key] || key}
      </span>
    );
  };

  return (
    <AdminPageShell
      hint="优惠券活动只负责“展示和发放规则”，真正的券仍然在优惠券管理里维护。这样不会再出现营销活动里重复建券的问题。"
      toolbar={(
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => navigate("/admin/marketing/coupons")} className="flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm">
            <ClipboardList size={15} /> 优惠券管理
          </button>
          <PermissionGate permission="coupon.manage">
            <button type="button" onClick={() => navigate("/admin/marketing/coupon-campaigns/new")} className="flex items-center gap-1 rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-primary-foreground">
              <Plus size={16} /> 新建优惠券活动
            </button>
          </PermissionGate>
        </div>
      )}
      filters={(
        <div className="grid gap-3 rounded-xl border border-border bg-card p-3 md:grid-cols-[1fr_160px_140px_auto]">
          <SearchBar placeholder="搜索活动名称" value={keyword} onChange={(value) => { setKeyword(value); setPage(1); }} />
          <select value={campaignType} onChange={(e) => { setCampaignType(e.target.value as CouponCampaignType | ""); setPage(1); }} className="rounded-lg bg-secondary px-3 py-2 text-sm">
            <option value="">全部活动</option>
            {Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <select value={status} onChange={(e) => { setStatus(e.target.value as CouponCampaignStatus | ""); setPage(1); }} className="rounded-lg bg-secondary px-3 py-2 text-sm">
            <option value="">全部状态</option>
            {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <button type="button" onClick={() => setPage(1)} className="rounded-lg border border-border px-4 py-2 text-sm">查询</button>
        </div>
      )}
    >
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <AnimatedTable
          loading={loading}
          rows={campaigns}
          rowKey={(campaign: CouponCampaign) => campaign.id}
          skeletonRows={6}
          skeletonCols={7}
          className="overflow-x-auto"
          tableClassName="w-full min-w-[1000px] text-sm"
          theadClassName="text-xs text-muted-foreground"
          thead={adminTableTheadRow(["活动名称", "类型", "状态", "券数量", "领取/使用", "活动时间", "操作"], columnAligns)}
          footer={<Pagination total={total} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} />}
          emptyIcon={Gift}
          emptyTitle="暂无优惠券活动"
          emptyDescription="先到优惠券管理创建券，再在这里决定这些券用什么活动展示、什么时候展示、给谁展示。"
          renderRow={(campaign) => (
            <>
              <AdminTableCell>{campaign.title}<div className="mt-1 text-xs text-muted-foreground">{campaign.subtitle || campaign.description || "-"}</div></AdminTableCell>
              <AdminTableCell align="center">{typeLabels[campaign.campaign_type] || campaign.campaign_type}</AdminTableCell>
              <AdminTableCell align="center">{renderStatus(campaign)}</AdminTableCell>
              <AdminTableCell align="center">{campaign.coupon_count || 0}</AdminTableCell>
              <AdminTableCell align="right">{campaign.claimed_count || 0} / {campaign.used_count || 0}</AdminTableCell>
              <AdminTableCell>{formatDateRange(campaign.start_at, campaign.end_at)}</AdminTableCell>
              <AdminTableCell align="right">
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => navigate(`/admin/marketing/coupon-campaigns/${campaign.id}`)} className="rounded-lg border border-border px-2 py-1 text-xs"><Pencil size={13} className="mr-1 inline" />编辑</button>
                  <PermissionGate permission="coupon.manage">
                    <button type="button" onClick={() => setDeleteId(campaign.id)} className="rounded-lg border border-red-200 px-2 py-1 text-xs text-red-700"><Trash2 size={13} className="mr-1 inline" />删除</button>
                  </PermissionGate>
                </div>
              </AdminTableCell>
            </>
          )}
        />
      </div>

      <AnimatedConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="删除优惠券活动"
        description="删除后前台不会再展示这个活动，但优惠券本身不会被删除。确定继续吗？"
        confirmText="删除"
        cancelText="取消"
        danger
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
      />
    </AdminPageShell>
  );
}
