import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import * as activityService from "@/services/admin/activityService";
import type { ActivityPayload, ActivityProductItem, ActivityStatus, ActivityType } from "@/types/activity";
import { toastErrorMessage } from "@/utils/errorMessage";
import ActivityProductPicker from "@/components/admin/ActivityProductPicker";
import { AnimatedConfirmDialog, LoadingButton } from "@/modules/micro-interactions";
import { Tx } from "@/components/admin/AdminText";
import {
  DISPLAY_POSITIONS,
  DISPLAY_POSITION_LABELS,
  WIP_ACTIVITY_TYPES,
  type DisplayPosition,
} from "@/constants/marketingDisplayPositions";
import { labelActivityType } from "@/utils/adminDisplayLabels";
import { fetchCoupons } from "@/services/admin/couponService";
import type { Coupon } from "@/types/coupon";

const STEPS = ["选择类型", "基础信息", "活动规则", "适用范围", "展示设置", "预览发布"] as const;

function labelType(type: ActivityType) {
  return labelActivityType(type);
}

function toggleDisplayPosition(current: string[] | undefined, key: DisplayPosition) {
  const set = new Set(current || []);
  if (set.has(key)) set.delete(key);
  else set.add(key);
  return [...set];
}

export default function AdminActivityForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const [search] = useSearchParams();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [publishConfirmOpen, setPublishConfirmOpen] = useState(false);
  const [pendingPublishStatus, setPendingPublishStatus] = useState<ActivityStatus | null>(null);
  const [statusLabel, setStatusLabel] = useState("草稿");
  const [couponOptions, setCouponOptions] = useState<Coupon[]>([]);
  const [couponsLoading, setCouponsLoading] = useState(false);
  const [form, setForm] = useState<ActivityPayload>({
    type: (search.get("type") as ActivityType) || "flash_sale",
    title: "",
    subtitle: "",
    description: "",
    start_at: "",
    end_at: "",
    status: "draft",
    disabled: false,
    threshold_amount: null,
    discount_amount: null,
    scope_type: "product",
    scope_ids: [],
    allow_coupon_stack: true,
    allow_points_stack: true,
    allow_reward: false,
    publish_at: null,
    internal_note: "",
    display_positions: [],
    activity_config: { full_reduction_rules: [{ threshold_amount: 100, discount_amount: 10 }] },
    sort_order: 0,
    items: [],
  });

  useEffect(() => {
    if (!isEdit || !id) return;
    void (async () => {
      try {
        const d = await activityService.fetchActivity(id);
        setForm({
          type: d.type,
          title: d.title,
          subtitle: d.subtitle || "",
          description: d.description || "",
          start_at: d.start_at,
          end_at: d.end_at,
          status: (d.status || "draft") as ActivityStatus,
          disabled: d.disabled,
          threshold_amount: d.threshold_amount ?? null,
          discount_amount: d.discount_amount ?? null,
          scope_type: d.scope_type || "product",
          scope_ids: d.scope_ids || [],
          allow_coupon_stack: d.allow_coupon_stack ?? true,
          allow_points_stack: d.allow_points_stack ?? true,
          allow_reward: d.allow_reward ?? false,
          publish_at: d.publish_at || null,
          internal_note: d.internal_note || "",
          display_positions: d.display_positions || [],
          activity_config: d.activity_config || {},
          sort_order: d.sort_order || 0,
          items: d.items || [],
        });
        setStatusLabel(d.status_label || "草稿");
      } catch (e) {
        toast.error(toastErrorMessage(e, "加载活动失败"));
      }
    })();
  }, [id, isEdit]);

  useEffect(() => {
    if (form.type !== "coupon_activity" && form.type !== "new_user_gift") return;
    let cancelled = false;
    setCouponsLoading(true);
    fetchCoupons({ page: 1, pageSize: 200 })
      .then((res) => {
        if (!cancelled) setCouponOptions(res.list || []);
      })
      .catch(() => {
        if (!cancelled) setCouponOptions([]);
      })
      .finally(() => {
        if (!cancelled) setCouponsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [form.type]);

  const selectedCouponIds = Array.isArray((form.activity_config as { coupon_ids?: string[] })?.coupon_ids)
    ? ((form.activity_config as { coupon_ids: string[] }).coupon_ids)
    : [];

  const toggleCouponId = (couponId: string) => {
    setForm((prev) => {
      const cfg = { ...(prev.activity_config || {}) } as { coupon_ids?: string[] };
      const set = new Set(cfg.coupon_ids || []);
      if (set.has(couponId)) set.delete(couponId);
      else set.add(couponId);
      return { ...prev, activity_config: { ...cfg, coupon_ids: [...set] } };
    });
  };

  const localValidate = () => {
    if (!form.title.trim()) return "活动名称必填";
    if (!form.start_at || !form.end_at) return "开始/结束时间必填";
    if (new Date(form.end_at).getTime() <= new Date(form.start_at).getTime()) return "结束时间必须晚于开始时间";
    if (form.type === "flash_sale" && form.items.length === 0) return "秒杀活动必须选择商品";
    if ((form.type === "coupon_activity" || form.type === "new_user_gift") && !selectedCouponIds.length) {
      return "请至少选择一张优惠券";
    }
    if (!(form.display_positions || []).length) return "请至少选择一个展示位置";
    if (WIP_ACTIVITY_TYPES.includes(form.type)) return "该活动类型尚在开发中，仅可保存草稿";
    if (form.type === "full_reduction") {
      const rules = Array.isArray((form.activity_config as Record<string, unknown>)?.full_reduction_rules)
        ? ((form.activity_config as Record<string, unknown>).full_reduction_rules as Array<{ threshold_amount: number; discount_amount: number }>)
        : [{ threshold_amount: Number(form.threshold_amount || 0), discount_amount: Number(form.discount_amount || 0) }];
      if (!rules.length) return "至少配置一档满减";
      for (const r of rules) {
        if (Number(r.threshold_amount || 0) <= 0) return "满减门槛必须大于 0";
        if (Number(r.discount_amount || 0) <= 0) return "满减金额必须大于 0";
        if (Number(r.discount_amount || 0) > Number(r.threshold_amount || 0)) return "满减金额不能大于门槛";
      }
    }
    return "";
  };

  const validateAndSave = async (targetStatus: ActivityStatus) => {
    const localErr = localValidate();
    if (targetStatus !== "draft" && localErr) return toast.error(localErr);
    if (targetStatus !== "draft") {
      setPendingPublishStatus(targetStatus);
      setPublishConfirmOpen(true);
      return;
    }
    await performSave(targetStatus);
  };

  const performSave = async (targetStatus: ActivityStatus) => {
    setSaving(true);
    try {
      const payload = { ...form, status: targetStatus };
      if (targetStatus !== "draft") {
        await activityService.validateActivity(payload, id);
      }
      if (isEdit && id) await activityService.updateActivity(id, payload);
      else await activityService.createActivity(payload);
      toast.success(targetStatus === "draft" ? "草稿已保存" : "活动已发布");
      navigate("/admin/marketing/activities");
    } catch (e) {
      toast.error(toastErrorMessage(e, "保存失败"));
    } finally {
      setSaving(false);
    }
  };

  const previewHint = useMemo(() => (localValidate() ? "请完成活动规则后预览" : "配置完整，可发布"), [form]);

  const updateItem = (idx: number, patch: Partial<ActivityProductItem>) => {
    setForm((prev) => {
      const next = [...prev.items];
      next[idx] = { ...next[idx], ...patch };
      return { ...prev, items: next };
    });
  };

  const fullReductionRules = Array.isArray((form.activity_config as Record<string, unknown>)?.full_reduction_rules)
    ? ((form.activity_config as Record<string, unknown>).full_reduction_rules as Array<{ threshold_amount: number; discount_amount: number }>)
    : [{ threshold_amount: Number(form.threshold_amount || 0), discount_amount: Number(form.discount_amount || 0) }];

  const setFullReductionRules = (rules: Array<{ threshold_amount: number; discount_amount: number }>) => {
    setForm((prev) => ({
      ...prev,
      threshold_amount: rules[0]?.threshold_amount ?? null,
      discount_amount: rules[0]?.discount_amount ?? null,
      activity_config: { ...(prev.activity_config || {}), full_reduction_rules: rules },
    }));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <button onClick={() => navigate(-1)} className="text-sm text-muted-foreground"><Tx>返回</Tx></button>
          <h1 className="text-xl font-bold text-foreground">活动管理 / {isEdit ? "编辑活动" : "新建活动"}</h1>
          <p className="text-xs text-muted-foreground">状态：{statusLabel}</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[220px_1fr_340px]">
        <div className="rounded-xl border border-border bg-card p-3">
          {STEPS.map((s, i) => (
            <button key={s} onClick={() => setStep(i)} className={`mb-2 block w-full rounded-lg px-3 py-2 text-left text-sm ${i === step ? "bg-gold/15 text-theme-price" : "text-muted-foreground hover:bg-secondary"}`}>{i + 1}. {s}</button>
          ))}
        </div>

        <div className="rounded-xl border border-border bg-card p-4 space-y-4">
          {step === 0 && (
            <div className="grid gap-3 md:grid-cols-2">
              {[
                { k: "flash_sale" as const, t: "限时秒杀", d: "短时间低价促销，支持库存与限购", wip: false },
                { k: "full_reduction" as const, t: "满减活动", d: "订单满额减免，可全场/分类/商品", wip: false },
                { k: "coupon_activity" as const, t: "优惠券活动", d: "关联 coupons 表，在首页领券中心展示", wip: false },
                { k: "new_user_gift" as const, t: "新人礼包", d: "优惠券包，新用户注册自动发放", wip: false },
              ].map((x) => (
                <button
                  key={x.k}
                  type="button"
                  onClick={() =>
                    setForm((p) => ({
                      ...p,
                      type: x.k,
                      display_positions:
                        (p.display_positions || []).length > 0
                          ? p.display_positions
                          : x.k === "coupon_activity"
                            ? ["home_coupon_center"]
                            : x.k === "new_user_gift"
                              ? ["home_new_user_gift"]
                              : p.display_positions,
                    }))
                  }
                  className={`rounded-xl border p-3 text-left ${form.type === x.k ? "border-gold bg-gold/5" : "border-border"}`}
                >
                  <p className="font-semibold flex items-center gap-2">
                    {x.t}
                  </p>
                  <p className="text-xs text-muted-foreground">{x.d}</p>
                </button>
              ))}
            </div>
          )}

          {step === 1 && (
            <>
              <label className="block text-sm">活动名称（{form.title.length}/60）<input maxLength={60} value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} className="mt-1 w-full rounded-lg bg-secondary px-3 py-2" /></label>
              <label className="block text-sm"><Tx>副标题</Tx><input value={form.subtitle || ""} onChange={(e) => setForm((p) => ({ ...p, subtitle: e.target.value }))} className="mt-1 w-full rounded-lg bg-secondary px-3 py-2" /></label>
              <label className="block text-sm"><Tx>活动说明</Tx><textarea rows={3} value={form.description || ""} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} className="mt-1 w-full rounded-lg bg-secondary px-3 py-2" /></label>
              <div className="grid gap-2 md:grid-cols-2">
                <label className="text-sm"><Tx>开始时间</Tx><input type="datetime-local" value={form.start_at ? form.start_at.slice(0, 16) : ""} onChange={(e) => setForm((p) => ({ ...p, start_at: e.target.value }))} className="mt-1 w-full rounded-lg bg-secondary px-3 py-2" /></label>
                <label className="text-sm"><Tx>结束时间</Tx><input type="datetime-local" value={form.end_at ? form.end_at.slice(0, 16) : ""} onChange={(e) => setForm((p) => ({ ...p, end_at: e.target.value }))} className="mt-1 w-full rounded-lg bg-secondary px-3 py-2" /></label>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              {form.type === "flash_sale" && (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground"><Tx>活动商品配置</Tx></p>
                    <button type="button" onClick={() => setPickerOpen(true)} className="rounded-lg border border-border px-3 py-1.5 text-sm"><Tx>选择商品</Tx></button>
                  </div>
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="min-w-full text-sm">
                      <thead className="bg-secondary/60"><tr><th className="px-2 py-2 text-left"><Tx>商品</Tx></th><th className="px-2 py-2"><Tx>原价</Tx></th><th className="px-2 py-2"><Tx>活动价</Tx></th><th className="px-2 py-2"><Tx>真实库存</Tx></th><th className="px-2 py-2"><Tx>活动库存</Tx></th><th className="px-2 py-2"><Tx>限购</Tx></th><th className="px-2 py-2"><Tx>操作</Tx></th></tr></thead>
                      <tbody>
                        {form.items.map((it, idx) => (
                          <tr key={`${it.product_id}-${idx}`} className="border-t border-border">
                            <td className="px-2 py-2">{it.product_name || it.product_id}</td>
                            <td className="px-2 py-2 text-center">{it.product_price ?? "-"}</td>
                            <td className="px-2 py-2"><input type="number" value={it.activity_price} onChange={(e) => updateItem(idx, { activity_price: Number(e.target.value) })} className="w-24 rounded bg-secondary px-2 py-1" /></td>
                            <td className="px-2 py-2 text-center">{it.product_stock ?? "-"}</td>
                            <td className="px-2 py-2"><input type="number" value={it.activity_stock} onChange={(e) => updateItem(idx, { activity_stock: Number(e.target.value) })} className="w-24 rounded bg-secondary px-2 py-1" /></td>
                            <td className="px-2 py-2"><input type="number" value={it.limit_per_user} onChange={(e) => updateItem(idx, { limit_per_user: Number(e.target.value) })} className="w-20 rounded bg-secondary px-2 py-1" /></td>
                            <td className="px-2 py-2"><button type="button" onClick={() => setForm((p) => ({ ...p, items: p.items.filter((_, i) => i !== idx) }))} className="text-xs text-muted-foreground"><Tx>删除</Tx></button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
              {(form.type === "coupon_activity" || form.type === "new_user_gift") && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    <Tx>关联优惠券</Tx>
                    <span className="ml-2 text-xs text-muted-foreground">已选 {selectedCouponIds.length} 张</span>
                  </p>
                  {couponsLoading ? (
                    <p className="text-sm text-muted-foreground"><Tx>加载优惠券列表…</Tx></p>
                  ) : couponOptions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      <Tx>暂无可用优惠券，请先在</Tx>{" "}
                      <button type="button" onClick={() => navigate("/admin/marketing/coupons/new")} className="text-theme-price underline">
                        <Tx>优惠券管理</Tx>
                      </button>{" "}
                      <Tx>中创建</Tx>
                    </p>
                  ) : (
                    <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border border-border p-3">
                      {couponOptions.map((c) => {
                        const checked = selectedCouponIds.includes(c.id);
                        return (
                          <label
                            key={c.id}
                            className={`flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 text-sm ${checked ? "border-gold bg-gold/5" : "border-border"}`}
                          >
                            <input type="checkbox" checked={checked} onChange={() => toggleCouponId(c.id)} className="mt-1" />
                            <span>
                              <span className="font-medium">{c.title}</span>
                              <span className="ml-2 text-xs text-muted-foreground">{c.code}</span>
                              <span className="mt-0.5 block text-xs text-muted-foreground">
                                {c.type === "percent" ? `${c.value}%` : `RM ${c.value}`}
                                {c.min_amount > 0 ? ` · 满 RM ${c.min_amount}` : ""}
                              </span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
              {form.type === "full_reduction" && (
                <div className="space-y-2">
                  {fullReductionRules.map((r, idx) => (
                    <div key={idx} className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
                      <label className="text-sm"><Tx>满减门槛</Tx><input type="number" value={r.threshold_amount ?? ""} onChange={(e) => setFullReductionRules(fullReductionRules.map((x, i) => i === idx ? { ...x, threshold_amount: Number(e.target.value) } : x))} className="mt-1 w-full rounded-lg bg-secondary px-3 py-2" /></label>
                      <label className="text-sm"><Tx>减免金额</Tx><input type="number" value={r.discount_amount ?? ""} onChange={(e) => setFullReductionRules(fullReductionRules.map((x, i) => i === idx ? { ...x, discount_amount: Number(e.target.value) } : x))} className="mt-1 w-full rounded-lg bg-secondary px-3 py-2" /></label>
                      <button type="button" onClick={() => setFullReductionRules(fullReductionRules.filter((_, i) => i !== idx))} className="mt-7 rounded border border-border px-2 py-1 text-xs"><Tx>删除</Tx></button>
                    </div>
                  ))}
                  <button type="button" onClick={() => setFullReductionRules([...fullReductionRules, { threshold_amount: 0, discount_amount: 0 }])} className="rounded border border-border px-3 py-1 text-sm"><Tx>新增一档</Tx></button>
                </div>
              )}
              <div className="grid gap-2 md:grid-cols-3">
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!form.allow_coupon_stack} onChange={(e) => setForm((p) => ({ ...p, allow_coupon_stack: e.target.checked }))} /><Tx>允许叠加优惠券</Tx></label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!form.allow_points_stack} onChange={(e) => setForm((p) => ({ ...p, allow_points_stack: e.target.checked }))} /><Tx>允许使用积分</Tx></label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!form.allow_reward} onChange={(e) => setForm((p) => ({ ...p, allow_reward: e.target.checked }))} /><Tx>参与返现</Tx></label>
              </div>
            </>
          )}

          {step === 3 && (
            <div className="grid gap-2 md:grid-cols-2">
              <label className="text-sm"><Tx>适用范围
                </Tx><select value={form.scope_type || "product"} onChange={(e) => setForm((p) => ({ ...p, scope_type: e.target.value as ActivityPayload["scope_type"] }))} className="mt-1 w-full rounded-lg bg-secondary px-3 py-2">
                  <option value="all"><Tx>全场</Tx></option>
                  <option value="category"><Tx>指定分类</Tx></option>
                  <option value="product"><Tx>指定商品</Tx></option>
                  <option value="new_user"><Tx>新用户</Tx></option>
                  <option value="old_user"><Tx>老用户</Tx></option>
                </select>
              </label>
              <label className="text-sm"><Tx>范围 ID 列表（逗号分隔）
                </Tx><input value={(form.scope_ids || []).join(",")} onChange={(e) => setForm((p) => ({ ...p, scope_ids: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) }))} className="mt-1 w-full rounded-lg bg-secondary px-3 py-2" />
              </label>
            </div>
          )}

          {step === 4 && (
            <div className="grid gap-2 md:grid-cols-2">
              <div className="md:col-span-2">
                <p className="text-sm font-medium"><Tx>展示位置</Tx></p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {DISPLAY_POSITIONS.map((key) => {
                    const checked = (form.display_positions || []).includes(key);
                    return (
                      <label
                        key={key}
                        className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs ${checked ? "border-gold bg-gold/10" : "border-border"}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setForm((p) => ({
                              ...p,
                              display_positions: toggleDisplayPosition(p.display_positions, key),
                            }))
                          }
                        />
                        {DISPLAY_POSITION_LABELS[key]}
                      </label>
                    );
                  })}
                </div>
              </div>
              <label className="text-sm"><Tx>内部备注
                </Tx><input value={form.internal_note || ""} onChange={(e) => setForm((p) => ({ ...p, internal_note: e.target.value }))} className="mt-1 w-full rounded-lg bg-secondary px-3 py-2" />
              </label>
            </div>
          )}

          {step === 5 && <p className="text-sm text-muted-foreground">发布前校验：{previewHint}</p>}
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-2 text-sm font-semibold"><Tx>活动摘要</Tx></h3>
          <p className="text-sm">类型：{labelType(form.type)}</p>
          <p className="text-sm">名称：{form.title || "-"}</p>
          <p className="text-sm">时间：{form.start_at || "-"} ~ {form.end_at || "-"}</p>
          <p className="text-sm">商品数：{form.items.length}</p>
          <div className="mt-3 rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">前台预览：{previewHint}</div>
        </div>
      </div>

      <div className="sticky bottom-0 z-10 flex justify-end gap-2 rounded-xl border border-border bg-card p-3">
        <button onClick={() => setStep((s) => Math.max(0, s - 1))} className="rounded-lg border border-border px-3 py-2 text-sm"><Tx>上一步</Tx></button>
        <LoadingButton type="button" variant="outline" state={saving ? "loading" : "normal"} loadingText="保存中..." onClick={() => void validateAndSave("draft")} className="rounded-lg px-3 py-2 text-sm"><Tx>保存草稿</Tx></LoadingButton>
        <button onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))} className="rounded-lg border border-border px-3 py-2 text-sm"><Tx>下一步</Tx></button>
        <LoadingButton type="button" variant="gold" state={saving ? "loading" : "normal"} loadingText="发布中..." onClick={() => void validateAndSave("active")} className="rounded-lg px-3 py-2 text-sm font-semibold"><Tx>发布活动</Tx></LoadingButton>
        <button onClick={() => navigate("/admin/marketing/activities")} className="rounded-lg border border-border px-3 py-2 text-sm"><Tx>取消</Tx></button>
      </div>

      <AnimatedConfirmDialog
        open={publishConfirmOpen}
        onOpenChange={setPublishConfirmOpen}
        title="确认发布活动"
        description={
          pendingPublishStatus ? (
            <span className="block whitespace-pre-line text-sm">
              {`活动名称：${form.title}\n类型：${labelType(form.type)}\n时间：${form.start_at} ~ ${form.end_at}\n商品数：${form.items.length}\n发布后不可回退为草稿。`}
            </span>
          ) : null
        }
        confirmText="发布"
        onConfirm={async () => {
          if (pendingPublishStatus) await performSave(pendingPublishStatus);
          setPublishConfirmOpen(false);
          setPendingPublishStatus(null);
        }}
      />
      <ActivityProductPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        existingIds={form.items.map((x) => x.product_id)}
        onConfirm={(rows) => setForm((p) => ({ ...p, items: [...p.items, ...rows] }))}
      />
    </div>
  );
}
