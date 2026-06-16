import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ArrowLeft, Save } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import AdminPageShell from "@/components/admin/AdminPageShell";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import { useAdminFormDirty } from "@/hooks/useAdminFormDirty";
import { useAdminGoBack } from "@/hooks/useAdminGoBack";
import { adminQueryKeys } from "@/lib/adminQueryKeys";
import { toastErrorMessage } from "@/utils/errorMessage";
import * as campaignService from "@/services/admin/couponCampaignService";
import * as couponService from "@/services/admin/couponService";
import type {
  CouponCampaignAudienceType,
  CouponCampaignDisplayCategory,
  CouponCampaignIssueMode,
  CouponCampaignPayload,
  CouponCampaignStatus,
  CouponCampaignType,
} from "@/types/couponCampaign";

type CampaignFormState = CouponCampaignPayload;

const defaultForm: CampaignFormState = {
  campaign_type: "public_claim",
  title: "",
  subtitle: "",
  description: "",
  cover_image: "",
  display_category: "recommended",
  start_at: "",
  end_at: "",
  status: "draft",
  disabled: false,
  audience_type: "all",
  audience_config: null,
  audience_ids: [],
  issue_mode: "self_claim",
  sort_order: 0,
  internal_note: "",
  coupon_ids: [],
};

const displayCategoryOptions: Array<{ value: CouponCampaignDisplayCategory | ""; label: string }> = [
  { value: "", label: "自动判断" },
  { value: "recommended", label: "推荐" },
  { value: "new_user", label: "新人" },
  { value: "member", label: "会员" },
  { value: "shipping", label: "运费" },
  { value: "fixed", label: "满减" },
  { value: "percentage", label: "折扣" },
];

export default function AdminCouponCampaignForm() {
  const { id } = useParams();
  const isNew = !id;
  const [searchParams] = useSearchParams();
  const copyFromId = isNew ? String(searchParams.get("copy_from") || "").trim() : "";
  const navigate = useNavigate();
  const goBack = useAdminGoBack("/admin/marketing/coupon-campaigns");
  const queryClient = useQueryClient();
  const [form, setForm] = useState<CampaignFormState>(() => seedDefaultForm());
  const [formHydrated, setFormHydrated] = useState(() => isNew && !copyFromId);

  const detailQuery = useQuery({
    queryKey: id ? adminQueryKeys.couponCampaignDetail(id) : ["admin", "coupon-campaigns", "new"],
    queryFn: () => campaignService.fetchCouponCampaign(id as string),
    enabled: Boolean(id),
  });

  const copySourceQuery = useQuery({
    queryKey: copyFromId ? adminQueryKeys.couponCampaignDetail(copyFromId) : ["admin", "coupon-campaigns", "copy-source", "none"],
    queryFn: () => campaignService.fetchCouponCampaign(copyFromId),
    enabled: Boolean(copyFromId),
  });

  const couponsQuery = useQuery({
    queryKey: [...adminQueryKeys.coupons(), "campaign-select"],
    queryFn: () => couponService.fetchCoupons({ page: 1, pageSize: 100, publish_status: "active" }),
    staleTime: 60_000,
  });

  const coupons = couponsQuery.data?.list ?? [];
  const selectedCouponSet = useMemo(() => new Set(form.coupon_ids), [form.coupon_ids]);
  const detailLoading = !isNew && detailQuery.isLoading && !detailQuery.data;
  const copyLoading = Boolean(copyFromId) && copySourceQuery.isLoading && !copySourceQuery.data;
  const formLoading = detailLoading || copyLoading;
  const loadError = detailQuery.isError || copySourceQuery.isError;
  const {
    dirty: formDirty,
    hasDraft,
    markClean,
    discardDraft,
  } = useAdminFormDirty(form, formHydrated && !formLoading && !loadError, { restoreDraft: setForm });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: CampaignFormState = {
        ...form,
        start_at: fromDateTimeInput(form.start_at),
        end_at: fromDateTimeInput(form.end_at),
        coupon_ids: form.coupon_ids,
      };
      if (isNew) return campaignService.createCouponCampaign(payload);
      return campaignService.updateCouponCampaign(id as string, payload);
    },
    onSuccess: (campaign) => {
      markClean();
      toast.success(isNew ? "领券活动已创建" : "领券活动已保存");
      void queryClient.invalidateQueries({ queryKey: adminQueryKeys.couponCampaignsRoot() });
      void queryClient.invalidateQueries({ queryKey: adminQueryKeys.couponCampaignDetail(campaign.id) });
      navigate("/admin/marketing/coupon-campaigns", { replace: true });
    },
    onError: (error) => toast.error(toastErrorMessage(error, "保存领券活动失败")),
  });

  useEffect(() => {
    const campaign = detailQuery.data;
    if (!campaign) return;
    if (hasDraft || formDirty) {
      setFormHydrated(true);
      return;
    }
    setForm({
      campaign_type: campaign.campaign_type,
      title: campaign.title,
      subtitle: campaign.subtitle || "",
      description: campaign.description || "",
      cover_image: campaign.cover_image || "",
      display_category: campaign.display_category || "",
      start_at: toDateTimeInput(campaign.start_at),
      end_at: toDateTimeInput(campaign.end_at),
      status: campaign.status,
      disabled: Boolean(campaign.disabled),
      audience_type: campaign.audience_type || "all",
      audience_config: campaign.audience_config || null,
      audience_ids: campaign.audience_ids || [],
      issue_mode: campaign.issue_mode || "self_claim",
      sort_order: campaign.sort_order || 0,
      internal_note: campaign.internal_note || "",
      coupon_ids: campaign.coupon_ids || campaign.items?.map((item) => item.coupon_id).filter(Boolean) || [],
    });
    setFormHydrated(true);
  }, [detailQuery.data, formDirty, hasDraft]);

  useEffect(() => {
    const campaign = copySourceQuery.data;
    if (!isNew || !copyFromId || !campaign) return;
    if (hasDraft || formDirty) {
      setFormHydrated(true);
      return;
    }
    setForm({
      campaign_type: campaign.campaign_type,
      title: `${campaign.title || "领券活动"} 副本`,
      subtitle: campaign.subtitle || "",
      description: campaign.description || "",
      cover_image: campaign.cover_image || "",
      display_category: campaign.display_category || "",
      start_at: "",
      end_at: "",
      status: "draft",
      disabled: false,
      audience_type: campaign.audience_type || "all",
      audience_config: campaign.audience_config || null,
      audience_ids: campaign.audience_ids || [],
      issue_mode: campaign.issue_mode || "self_claim",
      sort_order: campaign.sort_order || 0,
      internal_note: campaign.internal_note || "",
      coupon_ids: campaign.coupon_ids || campaign.items?.map((item) => item.coupon_id).filter(Boolean) || [],
    });
    setFormHydrated(true);
  }, [copyFromId, copySourceQuery.data, formDirty, hasDraft, isNew]);

  const updateField = <K extends keyof CampaignFormState>(key: K, value: CampaignFormState[K]) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "campaign_type" && value === "new_user_gift") {
        next.audience_type = "new_user";
        next.issue_mode = "auto_register";
        next.display_category = "new_user";
      }
      return next;
    });
  };

  const toggleCoupon = (couponId: string) => {
    setForm((prev) => ({
      ...prev,
      coupon_ids: prev.coupon_ids.includes(couponId)
        ? prev.coupon_ids.filter((id) => id !== couponId)
        : [...prev.coupon_ids, couponId],
    }));
  };

  const submitDisabled = saveMutation.isPending || formLoading || loadError || !form.title.trim() || !form.start_at || !form.end_at;
  const loadStatusMessage = detailLoading ? "活动加载中..." : copyLoading ? "正在读取复制来源..." : "";
  const loadErrorMessage = detailQuery.isError
    ? toastErrorMessage(detailQuery.error, "加载领券活动失败")
    : copySourceQuery.isError
      ? toastErrorMessage(copySourceQuery.error, "加载复制来源失败")
      : "";

  return (
    <AdminPageShell
      showTitle
      title={copyFromId ? "复制领券活动" : isNew ? "新建领券活动" : "编辑领券活动"}
      hint="领券活动负责前台活动包装和人群/发放方式，具体券面金额、使用门槛、有效期仍来自优惠券模板。"
      toolbar={
        <UnifiedButton
          type="button"
          onClick={() => void goBack()}
          className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-border px-3 text-sm hover:bg-secondary"
        >
          <ArrowLeft size={15} />
          返回列表
        </UnifiedButton>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <form
          className="space-y-4 rounded-xl border border-border bg-card p-4"
          aria-busy={formLoading || saveMutation.isPending}
          onSubmit={(event) => {
            event.preventDefault();
            if (submitDisabled) return;
            saveMutation.mutate();
          }}
        >
          {loadStatusMessage ? (
            <p className="rounded-md bg-secondary px-3 py-2 text-sm text-muted-foreground">{loadStatusMessage}</p>
          ) : null}

          {loadErrorMessage ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-[var(--theme-danger)]/10 px-3 py-2 text-sm text-[var(--theme-danger)]">
              <span>{loadErrorMessage}</span>
              <UnifiedButton
                type="button"
                onClick={() => {
                  if (detailQuery.isError) void detailQuery.refetch();
                  if (copySourceQuery.isError) void copySourceQuery.refetch();
                }}
                className="min-h-8 rounded-md border border-[var(--theme-danger)]/40 px-3 text-xs"
              >
                重试
              </UnifiedButton>
            </div>
          ) : null}

          {hasDraft ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-secondary px-3 py-2 text-sm text-muted-foreground">
              <span>已恢复未保存草稿，保存后会覆盖当前活动。</span>
              <UnifiedButton type="button" onClick={discardDraft} className="min-h-8 rounded-md border border-border px-3 text-xs">
                丢弃草稿
              </UnifiedButton>
            </div>
          ) : formDirty ? (
            <p className="rounded-md bg-secondary px-3 py-2 text-sm text-muted-foreground">有未保存修改，离开页面前请保存。</p>
          ) : null}

          <fieldset disabled={formLoading || saveMutation.isPending} className="space-y-4 disabled:opacity-70">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="活动名称" required>
                <input value={form.title} onChange={(event) => updateField("title", event.target.value)} className="admin-input" />
              </Field>
              <Field label="活动类型">
                <select value={form.campaign_type} onChange={(event) => updateField("campaign_type", event.target.value as CouponCampaignType)} className="admin-input">
                  <option value="public_claim">公开领取</option>
                  <option value="new_user_gift">新人礼包</option>
                  <option value="member">会员专享</option>
                  <option value="seasonal">季节活动</option>
                  <option value="compensation">补偿发放</option>
                  <option value="code">兑换码</option>
                </select>
              </Field>
              <Field label="前台优惠分类">
                <select
                  value={form.display_category || ""}
                  onChange={(event) => updateField("display_category", event.target.value as CouponCampaignDisplayCategory | "")}
                  className="admin-input"
                >
                  {displayCategoryOptions.map((option) => (
                    <option key={option.value || "auto"} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="副标题">
                <input value={form.subtitle || ""} onChange={(event) => updateField("subtitle", event.target.value)} className="admin-input" />
              </Field>
              <Field label="状态">
                <select value={form.status || "draft"} onChange={(event) => updateField("status", event.target.value as CouponCampaignStatus)} className="admin-input">
                  <option value="draft">草稿</option>
                  <option value="active">发布</option>
                  <option value="paused">暂停</option>
                  <option value="ended">结束</option>
                  <option value="disabled">停用</option>
                  <option value="archived">归档</option>
                </select>
              </Field>
              <Field label="开始时间" required>
                <input type="datetime-local" value={form.start_at} onChange={(event) => updateField("start_at", event.target.value)} className="admin-input" />
              </Field>
              <Field label="结束时间" required>
                <input type="datetime-local" value={form.end_at} onChange={(event) => updateField("end_at", event.target.value)} className="admin-input" />
              </Field>
              <Field label="目标人群">
                <select value={form.audience_type || "all"} onChange={(event) => updateField("audience_type", event.target.value as CouponCampaignAudienceType)} className="admin-input">
                  <option value="all">全部用户</option>
                  <option value="new_user">新用户</option>
                  <option value="old_user">老用户</option>
                  <option value="member_level">会员等级</option>
                  <option value="user_tag">用户标签</option>
                </select>
              </Field>
              <Field label="发放方式">
                <select value={form.issue_mode || "self_claim"} onChange={(event) => updateField("issue_mode", event.target.value as CouponCampaignIssueMode)} className="admin-input">
                  <option value="self_claim">用户自领</option>
                  <option value="auto_register">注册自动发放</option>
                  <option value="admin_issue">后台发放</option>
                  <option value="code_redeem">兑换码领取</option>
                </select>
              </Field>
            </div>

            <Field label="活动描述">
              <textarea value={form.description || ""} onChange={(event) => updateField("description", event.target.value)} className="admin-input min-h-24 resize-y" />
            </Field>

            <Field label="内部备注">
              <textarea value={form.internal_note || ""} onChange={(event) => updateField("internal_note", event.target.value)} className="admin-input min-h-20 resize-y" />
            </Field>

            <div className="flex justify-end border-t border-border pt-4">
              <UnifiedButton
                type="submit"
                disabled={submitDisabled}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[var(--theme-price)] px-5 text-sm font-semibold text-[var(--theme-price-foreground)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Save size={16} />
                {saveMutation.isPending ? "保存中..." : "保存活动"}
              </UnifiedButton>
            </div>
          </fieldset>
        </form>

        <aside className="rounded-xl border border-border bg-card p-4">
          <div className="mb-3">
            <h3 className="font-semibold text-foreground">选择优惠券模板</h3>
            <p className="mt-1 text-xs text-muted-foreground">发布活动前至少选择一张可领取的优惠券。</p>
          </div>
          {couponsQuery.isLoading ? (
            <p className="py-6 text-sm text-muted-foreground">优惠券加载中...</p>
          ) : coupons.length === 0 ? (
            <p className="rounded-lg bg-secondary px-3 py-4 text-sm text-muted-foreground">暂无可用优惠券模板，请先创建并发布优惠券。</p>
          ) : (
            <div className="max-h-[520px] space-y-2 overflow-auto pr-1">
              {coupons.map((coupon) => (
                <label key={coupon.id} className="flex cursor-pointer items-start gap-3 rounded-lg border border-border px-3 py-2 hover:bg-secondary/60">
                  <input
                    type="checkbox"
                    checked={selectedCouponSet.has(coupon.id)}
                    disabled={formLoading || saveMutation.isPending}
                    onChange={() => toggleCoupon(coupon.id)}
                    className="mt-1"
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-foreground">{coupon.title}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {coupon.code} · {coupon.type === "fixed" ? `减 RM ${coupon.value}` : coupon.type === "percentage" ? `${coupon.value}% 折扣` : "运费券"}
                      {Number(coupon.min_amount || 0) > 0 ? ` · 满 RM ${coupon.min_amount}` : ""}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          )}
        </aside>
      </div>
    </AdminPageShell>
  );
}

function Field({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-foreground">
        {label}
        {required ? <span className="ml-1 text-[var(--theme-danger)]">*</span> : null}
      </span>
      {children}
    </label>
  );
}

function seedDefaultForm(): CampaignFormState {
  const start = new Date();
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
  return {
    ...defaultForm,
    start_at: toDateTimeInput(start.toISOString()),
    end_at: toDateTimeInput(end.toISOString()),
  };
}

function toDateTimeInput(value: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isFinite(date.getTime())) {
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
    return local.toISOString().slice(0, 16);
  }
  return value.replace(" ", "T").slice(0, 16);
}

function fromDateTimeInput(value: string) {
  if (!value) return "";
  return value.length === 16 ? `${value.replace("T", " ")}:00` : value.replace("T", " ");
}
