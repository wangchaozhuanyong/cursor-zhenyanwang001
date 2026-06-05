import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Save } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import AdminPageShell from "@/components/admin/AdminPageShell";
import SearchBar from "@/components/SearchBar";
import { LoadingButton } from "@/modules/micro-interactions";
import { adminQueryKeys } from "@/lib/adminQueryKeys";
import { toastErrorMessage } from "@/utils/errorMessage";
import { fetchCoupons } from "@/services/admin/couponService";
import * as userService from "@/services/admin/userService";
import * as campaignService from "@/services/admin/couponCampaignService";
import type { Coupon } from "@/types/coupon";
import type {
  CouponCampaignAudienceType,
  CouponCampaignIssueMode,
  CouponCampaignPayload,
  CouponCampaignStatus,
  CouponCampaignType,
} from "@/types/couponCampaign";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import { useAdminFormDirty } from "@/hooks/useAdminFormDirty";
import { useAdminGoBack } from "@/hooks/useAdminGoBack";
import { invalidateHomeBootstrapCache } from "@/services/homeService";
import { invalidateCouponStoreCache } from "@/stores/useCouponStore";

type FormState = Omit<CouponCampaignPayload, "coupon_ids"> & { coupon_ids: string[] };

const typeOptions: Array<{ value: CouponCampaignType; label: string; hint: string }> = [
  { value: "public_claim", label: "公开领券", hint: "前台领券中心展示，用户自己领取" },
  { value: "new_user_gift", label: "新人礼包", hint: "新用户注册后自动发放" },
  { value: "member", label: "会员专享", hint: "只给指定会员等级展示" },
  { value: "user_tag", label: "标签人群", hint: "只给指定用户标签展示" },
  { value: "code", label: "兑换码", hint: "用于线下或客服发码" },
  { value: "seasonal", label: "节日活动", hint: "节假日、节点大促用" },
  { value: "compensation", label: "补偿发券", hint: "客服或售后补偿场景" },
];

const statusOptions: Array<{ value: CouponCampaignStatus; label: string }> = [
  { value: "draft", label: "草稿" },
  { value: "active", label: "启用" },
  { value: "disabled", label: "停用" },
];

const audienceOptions: Array<{ value: CouponCampaignAudienceType; label: string }> = [
  { value: "all", label: "全部用户" },
  { value: "new_user", label: "新用户" },
  { value: "old_user", label: "老用户" },
  { value: "member_level", label: "指定会员等级" },
  { value: "user_tag", label: "指定用户标签" },
];

function toLocalDateTime(value?: string) {
  if (!value) return "";
  return String(value).replace(" ", "T").slice(0, 16);
}

function addDays(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setMinutes(0, 0, 0);
  return d.toISOString().slice(0, 16);
}

function createInitialForm(type: CouponCampaignType = "public_claim"): FormState {
  const base: FormState = {
    campaign_type: type,
    title: "",
    subtitle: "",
    description: "",
    cover_image: "",
    start_at: addDays(0),
    end_at: addDays(30),
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
  return applyTypeDefaults(base, type);
}

function applyTypeDefaults(form: FormState, type: CouponCampaignType): FormState {
  if (type === "new_user_gift") return { ...form, campaign_type: type, audience_type: "new_user", audience_ids: [], issue_mode: "auto_register" };
  if (type === "member") return { ...form, campaign_type: type, audience_type: "member_level", issue_mode: "self_claim" };
  if (type === "user_tag") return { ...form, campaign_type: type, audience_type: "user_tag", issue_mode: "self_claim" };
  if (type === "code") return { ...form, campaign_type: type, audience_type: "all", audience_ids: [], issue_mode: "code_redeem" };
  if (type === "compensation") return { ...form, campaign_type: type, audience_type: "all", audience_ids: [], issue_mode: "admin_issue" };
  return { ...form, campaign_type: type, issue_mode: "self_claim" };
}

function couponAmountText(coupon: Coupon) {
  if (coupon.type === "percentage") return `${coupon.value}%`;
  if (coupon.type === "shipping") return "免运费";
  return `RM ${coupon.value}`;
}

export default function AdminCouponCampaignForm() {
  const navigate = useNavigate();
  const goBack = useAdminGoBack("/admin/marketing/coupon-campaigns");
  const queryClient = useQueryClient();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isEdit = Boolean(id);
  const requestedType = (searchParams.get("type") as CouponCampaignType) || "public_claim";
  const [form, setForm] = useState<FormState>(() => createInitialForm(requestedType));
  const [formHydrated, setFormHydrated] = useState(!isEdit);
  const [couponKeyword, setCouponKeyword] = useState("");

  const campaignQuery = useQuery({
    queryKey: adminQueryKeys.couponCampaignDetail(id || ""),
    queryFn: () => campaignService.fetchCouponCampaign(id!),
    enabled: isEdit && Boolean(id),
    staleTime: 60_000,
  });

  const couponsQuery = useQuery({
    queryKey: [...adminQueryKeys.coupons(), { page: 1, pageSize: 200, keyword: couponKeyword }],
    queryFn: () => fetchCoupons({ page: 1, pageSize: 200, keyword: couponKeyword || undefined }).then((res) => res.list || []),
    staleTime: 60_000,
  });

  const memberLevelsQuery = useQuery({
    queryKey: adminQueryKeys.memberLevels(),
    queryFn: userService.fetchMemberLevels,
    enabled: form.audience_type === "member_level",
    staleTime: 120_000,
  });

  const tagsQuery = useQuery({
    queryKey: [...adminQueryKeys.usersRoot(), "tags"],
    queryFn: userService.fetchUserTags,
    enabled: form.audience_type === "user_tag",
    staleTime: 120_000,
  });

  const campaignLoading = isEdit && campaignQuery.isLoading && !campaignQuery.data;
  const { markClean } = useAdminFormDirty(form, formHydrated && !campaignLoading);

  useEffect(() => {
    if (!campaignQuery.data) return;
    const d = campaignQuery.data;
    setForm({
      campaign_type: d.campaign_type || "public_claim",
      title: d.title || "",
      subtitle: d.subtitle || "",
      description: d.description || "",
      cover_image: d.cover_image || "",
      start_at: toLocalDateTime(d.start_at),
      end_at: toLocalDateTime(d.end_at),
      status: d.status || "draft",
      disabled: Boolean(d.disabled),
      audience_type: d.audience_type || "all",
      audience_config: d.audience_config || null,
      audience_ids: d.audience_ids || [],
      issue_mode: d.issue_mode || "self_claim",
      sort_order: d.sort_order || 0,
      internal_note: d.internal_note || "",
      coupon_ids: d.coupon_ids || [],
    });
    setFormHydrated(true);
  }, [campaignQuery.data]);

  const couponOptions = couponsQuery.data || [];
  const selectedCouponIds = useMemo(() => new Set(form.coupon_ids), [form.coupon_ids]);
  const selectedCouponsFromDetail = campaignQuery.data?.items || [];

  const toggleCoupon = (couponId: string) => {
    setForm((prev) => {
      const set = new Set(prev.coupon_ids);
      if (set.has(couponId)) set.delete(couponId);
      else set.add(couponId);
      return { ...prev, coupon_ids: [...set] };
    });
  };

  const toggleAudienceId = (scopeId: string) => {
    setForm((prev) => {
      const set = new Set(prev.audience_ids || []);
      if (set.has(scopeId)) set.delete(scopeId);
      else set.add(scopeId);
      return { ...prev, audience_ids: [...set] };
    });
  };

  const validate = () => {
    if (!form.title.trim()) return "请填写活动名称";
    if (!form.start_at || !form.end_at) return "请选择活动开始和结束时间";
    if (new Date(form.end_at).getTime() <= new Date(form.start_at).getTime()) return "结束时间必须晚于开始时间";
    if (!form.coupon_ids.length) return "请至少选择一张优惠券";
    if ((form.audience_type === "member_level" || form.audience_type === "user_tag") && !(form.audience_ids || []).length) {
      return "当前人群需要至少选择一个目标";
    }
    return "";
  };

  const saveMutation = useMutation({
    mutationFn: async (targetStatus: CouponCampaignStatus) => {
      const err = targetStatus !== "draft" ? validate() : "";
      if (err) throw new Error(err);
      const payload: CouponCampaignPayload = {
        ...form,
        title: form.title.trim(),
        start_at: form.start_at.replace("T", " "),
        end_at: form.end_at.replace("T", " "),
        status: targetStatus,
        disabled: targetStatus === "disabled",
        audience_ids: form.audience_type === "member_level" || form.audience_type === "user_tag" ? form.audience_ids : [],
      };
      if (isEdit && id) return campaignService.updateCouponCampaign(id, payload);
      return campaignService.createCouponCampaign(payload);
    },
    onSuccess: async () => {
      toast.success("发券活动已保存");
      invalidateCouponStoreCache();
      invalidateHomeBootstrapCache();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.couponCampaignsRoot() }),
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.marketingDashboard() }),
      ]);
      markClean();
      navigate("/admin/marketing/coupon-campaigns");
    },
    onError: (error) => toast.error(toastErrorMessage(error, "保存失败")),
  });

  const title = isEdit ? "编辑发券活动" : "新建发券活动";

  return (
    <AdminPageShell
      showTitle
      title={title}
      hint="先选已有优惠券模板，再设置活动时间、人群和发放方式。优惠券规则本身不在这里重复维护。"
      toolbar={(
        <UnifiedButton type="button" onClick={goBack} className="flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm">
          <ArrowLeft size={15} /> 返回列表
        </UnifiedButton>
      )}
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <section className="rounded-xl border border-border bg-card p-4">
            <h2 className="mb-3 text-base font-semibold">基础信息</h2>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-sm">活动名称
                <input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} className="mt-1 w-full rounded-lg bg-secondary px-3 py-2" />
              </label>
              <label className="text-sm">活动类型
                <select value={form.campaign_type} onChange={(e) => setForm((p) => applyTypeDefaults(p, e.target.value as CouponCampaignType))} className="mt-1 w-full rounded-lg bg-secondary px-3 py-2">
                  {typeOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </label>
              <label className="text-sm">副标题
                <input value={form.subtitle || ""} onChange={(e) => setForm((p) => ({ ...p, subtitle: e.target.value }))} className="mt-1 w-full rounded-lg bg-secondary px-3 py-2" />
              </label>
              <label className="text-sm">排序
                <input type="number" value={form.sort_order || 0} onChange={(e) => setForm((p) => ({ ...p, sort_order: Number(e.target.value) }))} className="mt-1 w-full rounded-lg bg-secondary px-3 py-2" />
              </label>
              <label className="text-sm">开始时间
                <input type="datetime-local" value={form.start_at} onChange={(e) => setForm((p) => ({ ...p, start_at: e.target.value }))} className="mt-1 w-full rounded-lg bg-secondary px-3 py-2" />
              </label>
              <label className="text-sm">结束时间
                <input type="datetime-local" value={form.end_at} onChange={(e) => setForm((p) => ({ ...p, end_at: e.target.value }))} className="mt-1 w-full rounded-lg bg-secondary px-3 py-2" />
              </label>
              <label className="text-sm md:col-span-2">活动说明
                <textarea value={form.description || ""} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={3} className="mt-1 w-full rounded-lg bg-secondary px-3 py-2" />
              </label>
            </div>
            <p className="mt-3 rounded-lg bg-secondary px-3 py-2 text-xs text-muted-foreground">
              {typeOptions.find((item) => item.value === form.campaign_type)?.hint}
            </p>
          </section>

          <section className="rounded-xl border border-border bg-card p-4">
            <h2 className="mb-3 text-base font-semibold">活动人群</h2>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-sm">人群范围
                <select
                  value={form.audience_type}
                  disabled={form.campaign_type === "new_user_gift"}
                  onChange={(e) => setForm((p) => ({ ...p, audience_type: e.target.value as CouponCampaignAudienceType, audience_ids: [] }))}
                  className="mt-1 w-full rounded-lg bg-secondary px-3 py-2 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {audienceOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </label>
              <label className="text-sm">发放方式
                <select value={form.issue_mode} onChange={(e) => setForm((p) => ({ ...p, issue_mode: e.target.value as CouponCampaignIssueMode }))} className="mt-1 w-full rounded-lg bg-secondary px-3 py-2">
                  <option value="self_claim">用户自己领取</option>
                  <option value="auto_register">注册自动发放</option>
                  <option value="admin_issue">后台手动发放</option>
                  <option value="code_redeem">兑换码领取</option>
                </select>
              </label>
            </div>

            {form.audience_type === "member_level" ? (
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {(memberLevelsQuery.data || []).map((level) => (
                  <label key={level.id} className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                    <input type="checkbox" checked={(form.audience_ids || []).includes(level.id)} onChange={() => toggleAudienceId(level.id)} />
                    {level.name}
                  </label>
                ))}
              </div>
            ) : null}

            {form.audience_type === "user_tag" ? (
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {(tagsQuery.data || []).map((tag) => (
                  <label key={tag.id} className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                    <input type="checkbox" checked={(form.audience_ids || []).includes(tag.id)} onChange={() => toggleAudienceId(tag.id)} />
                    {tag.name}
                  </label>
                ))}
              </div>
            ) : null}
          </section>

          <section className="rounded-xl border border-border bg-card p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-semibold">选择优惠券模板</h2>
              <div className="w-full md:w-72">
                <SearchBar placeholder="搜索优惠券" value={couponKeyword} onChange={setCouponKeyword} />
              </div>
            </div>
            <div className="grid max-h-[520px] gap-2 overflow-y-auto pr-1 md:grid-cols-2">
              {couponOptions.map((coupon) => {
                const checked = selectedCouponIds.has(coupon.id);
                return (
                  <label key={coupon.id} className={`cursor-pointer rounded-xl border px-3 py-2 text-sm transition ${checked ? "border-gold bg-gold/10" : "border-border bg-background"}`}>
                    <span className="flex items-start gap-2">
                      <input type="checkbox" checked={checked} onChange={() => toggleCoupon(coupon.id)} className="mt-1" />
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{coupon.title}</span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">{coupon.code || "无券码"} · {couponAmountText(coupon)}{Number(coupon.min_amount || 0) > 0 ? ` · 满 RM ${coupon.min_amount}` : ""}</span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">已领 {coupon.claimed_count || 0} · 已用 {coupon.used_count || 0}</span>
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
            {couponOptions.length === 0 ? <p className="rounded-lg bg-secondary px-3 py-4 text-sm text-muted-foreground">还没有可选优惠券，请先到“优惠券模板”创建券。</p> : null}
          </section>
        </div>

        <aside className="space-y-4">
          <section className="rounded-xl border border-border bg-card p-4">
            <h2 className="mb-3 text-base font-semibold">发布检查</h2>
            <div className="space-y-2 text-sm">
              <p>已选优惠券模板：<strong>{form.coupon_ids.length}</strong> 张</p>
              <p>展示位置：统一首页优惠券区</p>
              <p>活动状态：{statusOptions.find((item) => item.value === form.status)?.label || form.status}</p>
            </div>
            {selectedCouponsFromDetail.length && form.coupon_ids.some((couponId) => !couponOptions.some((coupon) => coupon.id === couponId)) ? (
              <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                有些已选优惠券模板不在当前搜索结果里，但保存时仍会保留。
              </div>
            ) : null}
            <div className="mt-4 grid gap-2">
              <LoadingButton state={saveMutation.isPending ? "loading" : "normal"} onClick={() => saveMutation.mutate("draft")} variant="outline" className="w-full justify-center">
                保存草稿
              </LoadingButton>
              <LoadingButton state={saveMutation.isPending ? "loading" : "normal"} onClick={() => saveMutation.mutate("active")} className="w-full justify-center">
                <Save size={15} className="mr-1" /> 保存并启用
              </LoadingButton>
            </div>
          </section>
        </aside>
      </div>
    </AdminPageShell>
  );
}
