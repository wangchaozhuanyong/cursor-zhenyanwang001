import { useEffect, useMemo, useState } from "react";
import { Archive, Ban, BarChart3, Copy, Megaphone, PauseCircle, Pencil, PlayCircle, Plus, Square, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import AdminPageShell from "@/components/admin/AdminPageShell";
import AdminRowActionsMenu from "@/components/admin/AdminRowActionsMenu";
import Pagination from "@/components/admin/Pagination";
import SearchBar from "@/components/SearchBar";
import { Tx } from "@/components/admin/AdminText";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import { AnimatedConfirmDialog } from "@/modules/micro-interactions";
import { adminQueryKeys } from "@/lib/adminQueryKeys";
import { toastErrorMessage } from "@/utils/errorMessage";
import { formatDateRange } from "@/utils/formatDateTime";
import { useAdminNavigation } from "@/hooks/useAdminNavigation";
import * as campaignService from "@/services/admin/couponCampaignService";
import type {
  CouponCampaign,
  CouponCampaignStatus,
  CouponCampaignStatusAction,
  CouponCampaignType,
} from "@/types/couponCampaign";
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
  { value: "paused", label: "已暂停" },
  { value: "ended", label: "已结束" },
  { value: "disabled", label: "已停用" },
  { value: "archived", label: "已归档" },
];

const statusClass: Record<CouponCampaignStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  scheduled: "bg-blue-100 text-blue-700",
  active: "bg-green-100 text-green-700",
  paused: "bg-amber-100 text-amber-700",
  ended: "bg-slate-100 text-slate-600",
  disabled: "bg-red-100 text-red-700",
  archived: "bg-zinc-100 text-zinc-600",
};

const displayCategoryLabels: Record<string, string> = {
  recommended: "推荐",
  new_user: "新人",
  member: "会员",
  shipping: "运费",
  fixed: "满减",
  percentage: "折扣",
};

function formatMoney(value: unknown) {
  return `RM ${Number(value || 0).toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

type StatusConfirmState = {
  campaign: CouponCampaign;
  action: CouponCampaignStatusAction;
  title: string;
  description: string;
  confirmText: string;
  danger?: boolean;
};

export default function AdminCouponCampaigns() {
  const adminNavigate = useAdminNavigation();
  const queryClient = useQueryClient();
  const [keyword, setKeyword] = useState("");
  const [campaignType, setCampaignType] = useState<CouponCampaignType | "">("");
  const [status, setStatus] = useState<CouponCampaignStatus | "">("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [statusConfirm, setStatusConfirm] = useState<StatusConfirmState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CouponCampaign | null>(null);

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

  const statusActionMutation = useMutation({
    mutationFn: ({ campaign, action }: { campaign: CouponCampaign; action: CouponCampaignStatusAction }) => (
      campaignService.updateCouponCampaignAction(campaign.id, action)
    ),
    onSuccess: () => {
      toast.success("活动状态已更新");
      setStatusConfirm(null);
      invalidateCampaigns();
    },
    onError: (error) => toast.error(toastErrorMessage(error, "更新活动状态失败")),
  });

  const deleteMutation = useMutation({
    mutationFn: (campaign: CouponCampaign) => campaignService.deleteCouponCampaign(campaign.id),
    onSuccess: () => {
      toast.success("活动已删除");
      setDeleteTarget(null);
      invalidateCampaigns();
    },
    onError: (error) => toast.error(toastErrorMessage(error, "删除活动失败")),
  });

  const requestStatusAction = (campaign: CouponCampaign, action: CouponCampaignStatusAction) => {
    setStatusConfirm(buildStatusConfirm(campaign, action));
  };

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
          <span className="text-right">券数 / 领取 / 核销</span>
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
                onCopy={() => { void adminNavigate(`/admin/marketing/coupon-campaigns/new?copy_from=${campaign.id}`); }}
                onReport={() => { void adminNavigate(`/admin/reports/coupons?coupon_campaign_id=${encodeURIComponent(campaign.id)}`); }}
                onStatusAction={(action) => requestStatusAction(campaign, action)}
                onDelete={() => setDeleteTarget(campaign)}
                actionBusy={statusActionMutation.isPending || deleteMutation.isPending}
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

      <AnimatedConfirmDialog
        open={!!statusConfirm}
        onOpenChange={(open) => !open && setStatusConfirm(null)}
        danger={!!statusConfirm?.danger}
        title={statusConfirm?.title || ""}
        description={statusConfirm?.description || ""}
        confirmText={statusConfirm?.confirmText || "确认"}
        onConfirm={() => {
          if (!statusConfirm) return;
          statusActionMutation.mutate({ campaign: statusConfirm.campaign, action: statusConfirm.action });
        }}
      />
      <AnimatedConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        danger
        title="删除领券活动"
        description={deleteTarget ? `确认删除「${deleteTarget.title}」吗？已有领取数据会继续保留在统计里。` : ""}
        confirmText="删除"
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteMutation.mutate(deleteTarget);
        }}
      />
    </AdminPageShell>
  );
}

function CampaignRow({
  campaign,
  onEdit,
  onCopy,
  onReport,
  onStatusAction,
  onDelete,
  actionBusy,
}: {
  campaign: CouponCampaign;
  onEdit: () => void;
  onCopy: () => void;
  onReport: () => void;
  onStatusAction: (action: CouponCampaignStatusAction) => void;
  onDelete: () => void;
  actionBusy?: boolean;
}) {
  const typeLabel = campaignTypeOptions.find((item) => item.value === campaign.campaign_type)?.label || campaign.campaign_type;
  const displayCategoryLabel = campaign.display_category ? displayCategoryLabels[campaign.display_category] || campaign.display_category : "";
  const statusLabel = statusOptions.find((item) => item.value === campaign.status)?.label || campaign.status;
  const canResume = campaign.status === "paused" || campaign.status === "disabled" || campaign.status === "archived" || Boolean(campaign.disabled);
  const pauseResumeAction: CouponCampaignStatusAction = canResume ? "resume" : "pause";
  const isEnded = campaign.status === "ended";
  const isArchived = campaign.status === "archived";
  const isDisabled = campaign.status === "disabled" || Boolean(campaign.disabled);

  return (
    <div className="grid gap-3 px-4 py-4 text-sm lg:grid-cols-[minmax(180px,1.5fr)_120px_120px_160px_120px_180px] lg:items-center">
      <div className="min-w-0">
        <p className="truncate font-semibold text-foreground">{campaign.title}</p>
        {campaign.subtitle ? <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{campaign.subtitle}</p> : null}
      </div>
      <div className="text-muted-foreground">
        <div>{typeLabel}</div>
        {displayCategoryLabel ? <div className="mt-1 text-xs text-muted-foreground">前台：{displayCategoryLabel}</div> : null}
      </div>
      <div>
        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${statusClass[campaign.status] || "bg-muted text-muted-foreground"}`}>
          {statusLabel}
        </span>
      </div>
      <div className="text-xs leading-5 text-muted-foreground">{formatDateRange(campaign.start_at, campaign.end_at)}</div>
      <div className="text-right text-muted-foreground">
        <div>{campaign.coupon_count ?? 0} / {campaign.claimed_count ?? 0} / {campaign.used_count ?? 0}</div>
        <div className="text-xs">{formatMoney(campaign.discount_total)}</div>
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <AdminRowActionsMenu
          primary={(
            <UnifiedButton type="button" onClick={onEdit} className="inline-flex h-8 min-w-[3.25rem] shrink-0 items-center justify-center gap-1 rounded-md border border-border bg-card px-2.5 text-xs font-medium text-foreground hover:bg-secondary">
              <Pencil size={13} />
              编辑
            </UnifiedButton>
          )}
          menuDisabled={actionBusy}
          moreLabel="更多"
          items={[
            {
              key: "copy",
              label: "复制",
              icon: <Copy className="h-3.5 w-3.5" aria-hidden />,
              onClick: onCopy,
            },
            {
              key: "report",
              label: "查看数据",
              icon: <BarChart3 className="h-3.5 w-3.5" aria-hidden />,
              onClick: onReport,
            },
            {
              key: pauseResumeAction,
              label: canResume ? "恢复" : "暂停",
              icon: canResume
                ? <PlayCircle className="h-3.5 w-3.5" aria-hidden />
                : <PauseCircle className="h-3.5 w-3.5" aria-hidden />,
              disabled: actionBusy || isEnded,
              onClick: () => onStatusAction(pauseResumeAction),
            },
            {
              key: "end",
              label: "结束",
              icon: <Square className="h-3.5 w-3.5" aria-hidden />,
              disabled: actionBusy || isEnded || isArchived,
              onClick: () => onStatusAction("end"),
            },
            {
              key: "archive",
              label: "归档",
              icon: <Archive className="h-3.5 w-3.5" aria-hidden />,
              disabled: actionBusy || isArchived,
              onClick: () => onStatusAction("archive"),
            },
            {
              key: "disable",
              label: "停用",
              icon: <Ban className="h-3.5 w-3.5" aria-hidden />,
              disabled: actionBusy || isDisabled || isArchived,
              onClick: () => onStatusAction("disable"),
            },
            {
              key: "delete",
              label: "删除",
              icon: <Trash2 className="h-3.5 w-3.5" aria-hidden />,
              danger: true,
              separatorBefore: true,
              onClick: onDelete,
            },
          ]}
        />
      </div>
    </div>
  );
}

function buildStatusConfirm(campaign: CouponCampaign, action: CouponCampaignStatusAction): StatusConfirmState {
  const title = campaign.title || campaign.id;
  const copy: Record<CouponCampaignStatusAction, Omit<StatusConfirmState, "campaign" | "action">> = {
    pause: {
      title: "暂停领券活动",
      description: `暂停「${title}」后，前台活动中心和领券入口将不再展示该活动。`,
      confirmText: "暂停",
    },
    resume: {
      title: "恢复领券活动",
      description: `恢复「${title}」会重新校验活动时间和优惠券可用性，校验通过后才会重新展示。`,
      confirmText: "恢复",
    },
    end: {
      title: "结束领券活动",
      description: `结束「${title}」后用户不能继续通过该活动领券，已有领取记录保留。`,
      confirmText: "结束",
      danger: true,
    },
    archive: {
      title: "归档领券活动",
      description: `归档「${title}」后会从常规运营列表和前台展示中移出，可通过已归档状态筛选查看。`,
      confirmText: "归档",
      danger: true,
    },
    disable: {
      title: "停用领券活动",
      description: `停用「${title}」后，前台不能继续展示或领取该活动。`,
      confirmText: "停用",
      danger: true,
    },
    enable: {
      title: "启用领券活动",
      description: `启用「${title}」会重新校验活动规则和优惠券可用性。`,
      confirmText: "启用",
    },
  };
  return {
    campaign,
    action,
    ...copy[action],
  };
}
