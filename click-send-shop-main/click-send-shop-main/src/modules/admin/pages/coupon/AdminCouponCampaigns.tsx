import { useEffect, useMemo, useState } from "react";
import { Ban, Megaphone, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import AdminPageShell from "@/components/admin/AdminPageShell";
import Pagination from "@/components/admin/Pagination";
import SearchBar from "@/components/SearchBar";
import { Tx } from "@/components/admin/AdminText";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import { adminQueryKeys } from "@/lib/adminQueryKeys";
import { toastErrorMessage } from "@/utils/errorMessage";
import { formatDateRange } from "@/utils/formatDateTime";
import { useAdminNavigation } from "@/hooks/useAdminNavigation";
import * as campaignService from "@/services/admin/couponCampaignService";
import type { CouponCampaign, CouponCampaignStatus, CouponCampaignType } from "@/types/couponCampaign";
import CouponCenterTabs from "./CouponCenterTabs";

const campaignTypeOptions: Array<{ value: CouponCampaignType | ""; label: string }> = [
  { value: "", label: "全部类型" },
  { value: "public_claim", label: "公开领取" },
  { value: "new_user_gift", label: "新人礼包" },
  { value: "member", label: "会员专享" },
  { value: "seasonal", label: "季节活动" },
  { value: "compensation", label: "补偿发放" },
  { value: "code", label: "兑换码" },
];

const statusOptions: Array<{ value: CouponCampaignStatus | ""; label: string }> = [
  { value: "", label: "全部状态" },
  { value: "draft", label: "草稿" },
  { value: "scheduled", label: "未开始" },
  { value: "active", label: "进行中" },
  { value: "ended", label: "已结束" },
  { value: "disabled", label: "已停用" },
];

const statusClass: Record<CouponCampaignStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  scheduled: "bg-blue-100 text-blue-700",
  active: "bg-green-100 text-green-700",
  ended: "bg-slate-100 text-slate-600",
  disabled: "bg-red-100 text-red-700",
};

export default function AdminCouponCampaigns() {
  const adminNavigate = useAdminNavigation();
  const queryClient = useQueryClient();
  const [keyword, setKeyword] = useState("");
  const [campaignType, setCampaignType] = useState<CouponCampaignType | "">("");
  const [status, setStatus] = useState<CouponCampaignStatus | "">("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filters = useMemo(
    () => ({
      page,
      pageSize,
      keyword: keyword.trim() || undefined,
      campaign_type: campaignType || undefined,
      status: status || undefined,
    }),
    [campaignType, keyword, page, pageSize, status],
  );

  const campaignsQuery = useQuery({
    queryKey: adminQueryKeys.couponCampaigns(filters),
    queryFn: () => campaignService.fetchCouponCampaigns(filters),
    staleTime: 60_000,
  });

  const campaigns = campaignsQuery.data?.list ?? [];
  const total = campaignsQuery.data?.total ?? 0;

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (page > totalPages) setPage(totalPages);
  }, [page, pageSize, total]);

  const invalidateCampaigns = () => {
    void queryClient.invalidateQueries({ queryKey: adminQueryKeys.couponCampaignsRoot() });
  };

  const statusMutation = useMutation({
    mutationFn: (campaign: CouponCampaign) => campaignService.setCouponCampaignDisabled(
      campaign.id,
      campaign.status !== "disabled" && !campaign.disabled,
    ),
    onSuccess: () => {
      toast.success("活动状态已更新");
      invalidateCampaigns();
    },
    onError: (error) => toast.error(toastErrorMessage(error, "更新活动状态失败")),
  });

  const deleteMutation = useMutation({
    mutationFn: (campaign: CouponCampaign) => campaignService.deleteCouponCampaign(campaign.id),
    onSuccess: () => {
      toast.success("活动已删除");
      invalidateCampaigns();
    },
    onError: (error) => toast.error(toastErrorMessage(error, "删除活动失败")),
  });

  return (
    <AdminPageShell
      showTitle
      title="领券活动"
      hint="用于把一组优惠券包装成前台可展示、可领取的活动，例如新人礼包、会员专享券包、季节活动。优惠券模板仍在「优惠券模板」中维护。"
      toolbar={
        <UnifiedButton
          type="button"
          onClick={() => { void adminNavigate("/admin/marketing/coupon-campaigns/new"); }}
          className="inline-flex min-h-[44px] items-center gap-1 rounded-lg bg-[var(--theme-price)] px-4 py-2.5 text-sm font-semibold text-[var(--theme-price-foreground)]"
        >
          <Plus size={16} />
          <Tx>新建领券活动</Tx>
        </UnifiedButton>
      }
      filters={
        <div className="space-y-3">
          <CouponCenterTabs />
          <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_160px_160px]">
            <SearchBar
              value={keyword}
              onChange={(value) => {
                setKeyword(value);
                setPage(1);
              }}
              placeholder="搜索活动名称"
            />
            <select
              value={campaignType}
              onChange={(event) => {
                setCampaignType(event.target.value as CouponCampaignType | "");
                setPage(1);
              }}
              className="min-h-[44px] rounded-xl border border-border bg-background px-3 text-sm"
            >
              {campaignTypeOptions.map((option) => (
                <option key={option.value || "all"} value={option.value}>{option.label}</option>
              ))}
            </select>
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as CouponCampaignStatus | "");
                setPage(1);
              }}
              className="min-h-[44px] rounded-xl border border-border bg-background px-3 text-sm"
            >
              {statusOptions.map((option) => (
                <option key={option.value || "all"} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        </div>
      }
    >
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="hidden grid-cols-[minmax(180px,1.5fr)_120px_120px_160px_120px_180px] gap-3 border-b border-border px-4 py-3 text-xs font-semibold text-muted-foreground lg:grid">
          <span>活动</span>
          <span>类型</span>
          <span>状态</span>
          <span>时间</span>
          <span className="text-right">券数 / 领取</span>
          <span className="text-right">操作</span>
        </div>

        {campaignsQuery.isLoading && !campaigns.length ? (
          <div className="px-4 py-12 text-center text-sm text-muted-foreground">加载中...</div>
        ) : campaigns.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-4 py-14 text-center">
            <Megaphone className="h-10 w-10 text-muted-foreground" />
            <div>
              <p className="font-semibold text-foreground">暂无领券活动</p>
              <p className="mt-1 text-sm text-muted-foreground">先创建优惠券模板，再把模板加入领券活动。</p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {campaigns.map((campaign) => (
              <CampaignRow
                key={campaign.id}
                campaign={campaign}
                onEdit={() => { void adminNavigate(`/admin/marketing/coupon-campaigns/${campaign.id}`); }}
                onToggle={() => statusMutation.mutate(campaign)}
                onDelete={() => {
                  if (window.confirm(`确定删除「${campaign.title}」吗？`)) deleteMutation.mutate(campaign);
                }}
              />
            ))}
          </div>
        )}

        <Pagination
          total={total}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      </div>
    </AdminPageShell>
  );
}

function CampaignRow({
  campaign,
  onEdit,
  onToggle,
  onDelete,
}: {
  campaign: CouponCampaign;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const typeLabel = campaignTypeOptions.find((item) => item.value === campaign.campaign_type)?.label || campaign.campaign_type;
  const statusLabel = statusOptions.find((item) => item.value === campaign.status)?.label || campaign.status;
  const disabled = campaign.status === "disabled" || campaign.disabled;

  return (
    <div className="grid gap-3 px-4 py-4 text-sm lg:grid-cols-[minmax(180px,1.5fr)_120px_120px_160px_120px_180px] lg:items-center">
      <div className="min-w-0">
        <p className="truncate font-semibold text-foreground">{campaign.title}</p>
        {campaign.subtitle ? <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{campaign.subtitle}</p> : null}
      </div>
      <div className="text-muted-foreground">{typeLabel}</div>
      <div>
        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${statusClass[campaign.status] || "bg-muted text-muted-foreground"}`}>
          {statusLabel}
        </span>
      </div>
      <div className="text-xs leading-5 text-muted-foreground">{formatDateRange(campaign.start_at, campaign.end_at)}</div>
      <div className="text-right text-muted-foreground">
        {campaign.coupon_count ?? 0} / {campaign.claimed_count ?? 0}
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <UnifiedButton type="button" onClick={onEdit} className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-border px-3 text-xs hover:bg-secondary">
          <Pencil size={13} />
          编辑
        </UnifiedButton>
        <UnifiedButton type="button" onClick={onToggle} className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-border px-3 text-xs hover:bg-secondary">
          {disabled ? <RotateCcw size={13} /> : <Ban size={13} />}
          {disabled ? "启用" : "停用"}
        </UnifiedButton>
        <UnifiedButton type="button" onClick={onDelete} className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-[var(--theme-danger)]/30 px-3 text-xs text-[var(--theme-danger)] hover:bg-[var(--theme-danger)]/10">
          <Trash2 size={13} />
          删除
        </UnifiedButton>
      </div>
    </div>
  );
}
