import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Coins, Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import { AnimatedTable } from "@/modules/micro-interactions";
import {
  AdminTableMobileCard,
  AdminTableMobileCardField,
} from "@/components/admin/AdminTableMobileCard";
import { ADMIN_TABLE_NOWRAP_CLASS, adminTdClassName, adminThClassName } from "@/utils/adminTableClasses";
import { Tx } from "@/components/admin/AdminText";
import AdminFieldHint, { AdminPageTitle, AdminSectionTitle } from "@/components/admin/AdminFieldHint";
import {
  POINTS_ADJUST_FIELD_HINTS,
  POINTS_ADVANCED_FIELD_HINTS,
  POINTS_OVERVIEW_STAT_HINTS,
  POINTS_PRODUCT_RULE_HINTS,
  POINTS_REDEEM_FIELD_HINTS,
  POINTS_RULE_FIELD_HINTS,
  POINTS_SECTION_HINTS,
  POINTS_TAB_HINTS,
} from "@/modules/admin/pages/marketing/adminPointsHints";
import AdminPointsRecords from "@/modules/admin/pages/user/AdminPointsRecords";
import AdminPointsGifts from "@/modules/admin/pages/marketing/AdminPointsGifts";
import {
  adjustUserPoints,
  createProductPointRule,
  fetchAdminPointsRecords,
  fetchPointsSettings,
  fetchProductPointRules,
  removeProductPointRule,
  savePointsSettings,
  runPointsExpireJob,
  saveProductPointRule,
  type LoyaltyPointsSettings,
  type ProductPointRule,
} from "@/services/admin/pointsService";
import { adminQueryKeys } from "@/lib/adminQueryKeys";
import { toastErrorMessage } from "@/utils/errorMessage";
import { useAdminT } from "@/hooks/useAdminT";
import { cn } from "@/lib/utils";

const inputCls =
  "min-h-9 w-full min-w-0 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground";
const labelCls = "shrink-0 text-sm font-medium text-foreground";

const defaultRule: ProductPointRule = {
  name: "",
  scope_type: "all",
  scope_id: "",
  priority: 100,
  earn_enabled: 1,
  earn_mode: "inherit",
  fixed_points: 0,
  points_percent: 0,
  multiplier_percent: 100,
  redeem_enabled: 1,
  max_redeem_percent: undefined,
  enabled: 1,
};

/** 下拉/数字：标签与控件同一行，避免 checkbox 列里大片空白 */
function InlineField({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label
      className={cn(
        "grid min-w-0 items-center gap-x-3 gap-y-1 sm:grid-cols-[minmax(6.5rem,9.5rem)_minmax(0,1fr)]",
        className,
      )}
    >
      <span className={cn(labelCls, "flex items-center gap-1.5")}>
        <Tx>{label}</Tx>
        {hint ? <AdminFieldHint text={hint} /> : null}
      </span>
      <div className="min-w-0">{children}</div>
    </label>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  hint?: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={cn(
        "flex min-h-10 cursor-pointer items-center justify-between gap-3 rounded-lg border border-border bg-secondary/40 px-3 py-2",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <span className="flex min-w-0 flex-1 items-center gap-1.5 text-sm font-medium leading-snug text-foreground">
        <Tx>{label}</Tx>
        {hint ? <AdminFieldHint text={hint} /> : null}
      </span>
      <input
        type="checkbox"
        className="h-4 w-4 shrink-0 accent-primary"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}

function SettingsSection({
  title,
  sectionHint,
  hint,
  children,
}: {
  title: string;
  sectionHint?: ReactNode;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div>
        <AdminSectionTitle title={<Tx>{title}</Tx>} hint={sectionHint ?? POINTS_SECTION_HINTS[title]} />
        {hint ? <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}

export default function AdminMarketingPoints() {
  const { tText } = useAdminT();
  const queryClient = useQueryClient();
  const tabs = useMemo(
    () => ["积分总览", "积分规则", "商品积分规则", "积分抵扣", "礼品兑换", "积分明细", "手动调整", "高级设置"] as const,
    [],
  );
  const [tab, setTab] = useState(tabs[0]);
  const [settings, setSettings] = useState<LoyaltyPointsSettings>({});
  const [ruleForm, setRuleForm] = useState<ProductPointRule>(defaultRule);
  const [adjustForm, setAdjustForm] = useState({ userId: "", points: "", reason: "" });

  const overviewQuery = useQuery({
    queryKey: adminQueryKeys.pointsOverview(),
    queryFn: async () => {
      const [nextSettings, nextRules, records] = await Promise.all([
        fetchPointsSettings(),
        fetchProductPointRules({ pageSize: 100 }),
        fetchAdminPointsRecords({ page: 1, pageSize: 5 }),
      ]);
      return {
        settings: nextSettings || {},
        rules: nextRules?.list || [],
        stats: records.stats || { totalEarned: 0, totalDeducted: 0, totalRecords: 0, activeUsers: 0 },
      };
    },
    staleTime: 60_000,
  });

  const rules = overviewQuery.data?.rules ?? [];
  const stats = overviewQuery.data?.stats ?? { totalEarned: 0, totalDeducted: 0, totalRecords: 0, activeUsers: 0 };
  const loading = overviewQuery.isLoading && !overviewQuery.data;

  useEffect(() => {
    if (overviewQuery.data?.settings) setSettings(overviewQuery.data.settings);
  }, [overviewQuery.data?.settings]);

  useEffect(() => {
    if (overviewQuery.isError) {
      toast.error(toastErrorMessage(overviewQuery.error, tText("加载积分管理数据失败")));
    }
  }, [overviewQuery.isError, overviewQuery.error, tText]);

  const invalidatePoints = () => queryClient.invalidateQueries({ queryKey: adminQueryKeys.pointsRoot() });

  const setSetting = (key: string, value: string | number | boolean | string[]) => setSettings((s) => {
    const next = { ...s, [key]: value };
    if (key === "point_value_myr") {
      const pointValue = Number(value);
      if (pointValue > 0) next.points_per_currency = Math.round(1 / pointValue);
    }
    if (key === "points_per_currency") {
      const pointsPerCurrency = Number(value);
      if (pointsPerCurrency > 0) next.point_value_myr = Number((1 / pointsPerCurrency).toFixed(4));
    }
    return next;
  });

  const saveSettingsMutation = useMutation({
    mutationFn: () => {
      const pointValue = Number(settings.point_value_myr || 0);
      const step = Number(settings.redeem_step || 1);
      if (pointValue <= 0 || step <= 0) throw new Error(tText("积分抵扣比例和使用步长必须大于 0"));
      return savePointsSettings(settings);
    },
    onSuccess: async (saved) => {
      setSettings(saved);
      toast.success(tText("积分设置已保存"));
      await invalidatePoints();
    },
    onError: (error) => toast.error(toastErrorMessage(error, tText("保存积分设置失败"))),
  });

  const saveRuleMutation = useMutation({
    mutationFn: () => {
      if (!ruleForm.name?.trim()) throw new Error(tText("请输入规则名称"));
      return ruleForm.id ? saveProductPointRule(ruleForm.id, ruleForm) : createProductPointRule(ruleForm);
    },
    onSuccess: async () => {
      setRuleForm(defaultRule);
      toast.success(tText("规则已保存"));
      await invalidatePoints();
    },
    onError: (error) => toast.error(toastErrorMessage(error, tText("保存规则失败"))),
  });

  const deleteRuleMutation = useMutation({
    mutationFn: (id: string) => removeProductPointRule(id),
    onSuccess: async () => {
      toast.success(tText("规则已停用"));
      await invalidatePoints();
    },
    onError: (error) => toast.error(toastErrorMessage(error, tText("停用规则失败"))),
  });

  const expireRunMutation = useMutation({
    mutationFn: () => runPointsExpireJob(),
    onSuccess: async (result) => {
      toast.success(tText(`过期任务已执行，处理 ${result?.processed ?? 0} 位用户`));
      await invalidatePoints();
    },
    onError: (error) => toast.error(toastErrorMessage(error, tText("执行积分过期任务失败"))),
  });

  const adjustMutation = useMutation({
    mutationFn: () => {
      const amount = Number(adjustForm.points);
      if (!adjustForm.userId || !Number.isFinite(amount) || amount === 0 || !adjustForm.reason.trim()) {
        throw new Error(tText("请填写用户 ID、调整积分和原因"));
      }
      return adjustUserPoints(adjustForm.userId, amount, adjustForm.reason);
    },
    onSuccess: async () => {
      setAdjustForm({ userId: "", points: "", reason: "" });
      toast.success(tText("积分已调整"));
      await invalidatePoints();
    },
    onError: (error) => toast.error(toastErrorMessage(error, tText("调整积分失败"))),
  });

  const editRule = (rule: ProductPointRule) => setRuleForm({ ...defaultRule, ...rule });

  const renderRuleMobileCard = (r: ProductPointRule) => (
    <AdminTableMobileCard>
      <div className="mb-2 flex items-start justify-between gap-2">
        <p className="text-sm font-semibold">{r.name}</p>
        <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-xs">{r.enabled ? tText("启用") : tText("停用")}</span>
      </div>
      <div className="mb-2 flex flex-wrap gap-1.5">
        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">{r.scope_type}:{r.scope_id || "all"}</span>
        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">{r.earn_mode}</span>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-2">
        <AdminTableMobileCardField label={tText("固定积分")}>
          <span className="text-xs text-muted-foreground">{r.fixed_points || 0}</span>
        </AdminTableMobileCardField>
        <AdminTableMobileCardField label={tText("百分比")}>
          <span className="text-xs text-muted-foreground">{r.points_percent || 0}</span>
        </AdminTableMobileCardField>
        <AdminTableMobileCardField label={tText("倍率")}>
          <span className="text-xs text-muted-foreground">{r.multiplier_percent || 100}</span>
        </AdminTableMobileCardField>
        <AdminTableMobileCardField label={tText("优先级")}>
          <span className="text-xs text-muted-foreground">{r.priority}</span>
        </AdminTableMobileCardField>
      </div>
      <div className="mt-3 flex gap-2 border-t border-border pt-3">
        <button type="button" onClick={() => editRule(r)} className="touch-manipulation flex-1 rounded-lg border border-border px-3 py-2 text-xs text-theme-price hover:bg-secondary"><Tx>编辑</Tx></button>
        <button type="button" onClick={() => r.id && deleteRuleMutation.mutate(r.id)} className="touch-manipulation rounded-lg border border-border px-3 py-2 text-xs text-destructive hover:bg-secondary"><Trash2 className="inline h-4 w-4" /></button>
      </div>
    </AdminTableMobileCard>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <AdminPageTitle
            title={<Tx>活动管理 / 积分管理</Tx>}
            hint={<Tx>订单积分、商品规则、抵扣比例和积分流水统一在这里维护。</Tx>}
          />
        </div>
        <button type="button" onClick={() => void invalidatePoints()} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-foreground" disabled={loading}><RefreshCw className="h-4 w-4" /><Tx>刷新</Tx></button>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm",
              tab === t ? "bg-gold/15 text-theme-price" : "bg-secondary text-muted-foreground",
            )}
          >
            {tText(t)}
            {POINTS_TAB_HINTS[t] ? <AdminFieldHint text={POINTS_TAB_HINTS[t]} /> : null}
          </button>
        ))}
      </div>

      {tab === "积分总览" ? (
        <div className="grid gap-3 md:grid-cols-4">
          {[["累计发放积分", stats.totalEarned], ["累计使用/回滚积分", stats.totalDeducted], ["积分流水数", stats.totalRecords], ["积分活跃用户", stats.activeUsers]].map(([k, v]) => (
            <div key={k} className="rounded-xl border border-border bg-card p-4">
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Tx>{String(k)}</Tx>
                {POINTS_OVERVIEW_STAT_HINTS[String(k)] ? (
                  <AdminFieldHint text={POINTS_OVERVIEW_STAT_HINTS[String(k)]} />
                ) : null}
              </p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{String(v)}</p>
            </div>
          ))}
        </div>
      ) : null}

      {tab === "积分规则" ? (
        <div className="space-y-6 rounded-xl border border-border bg-card p-4 sm:p-5">
          <SettingsSection title={tText("功能开关")}>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <ToggleRow
                label={tText("用户端显示积分入口")}
                hint={POINTS_RULE_FIELD_HINTS.display_enabled}
                checked={!!settings.display_enabled}
                onChange={(v) => setSetting("display_enabled", v)}
              />
              <ToggleRow
                label={tText("开启消费积分")}
                hint={POINTS_RULE_FIELD_HINTS.earn_enabled}
                checked={!!settings.earn_enabled}
                onChange={(v) => setSetting("earn_enabled", v)}
              />
              <ToggleRow
                label={tText("开启积分抵扣")}
                hint={POINTS_RULE_FIELD_HINTS.redeem_enabled}
                checked={!!settings.redeem_enabled}
                onChange={(v) => setSetting("redeem_enabled", v)}
              />
            </div>
          </SettingsSection>

          <SettingsSection
            title={tText("消费积分规则")}
            hint={<Tx>按金额与商品规则计算订单积分；关闭「开启消费积分」后前台不再发放消费积分。</Tx>}
          >
            <fieldset
              disabled={!settings.earn_enabled}
              className={cn("grid min-w-0 gap-3 border-0 p-0 lg:grid-cols-2", !settings.earn_enabled && "opacity-50")}
            >
              <InlineField label={tText("积分计算方式")} hint={POINTS_RULE_FIELD_HINTS.earn_mode}>
                <select className={inputCls} value={String(settings.earn_mode || "amount_plus_product_rule")} onChange={(e) => setSetting("earn_mode", e.target.value)}>
                  <option value="amount"><Tx>按金额积分</Tx></option>
                  <option value="product_rule"><Tx>商品/分类规则积分</Tx></option>
                  <option value="amount_plus_product_rule"><Tx>金额规则 + 商品特殊规则</Tx></option>
                </select>
              </InlineField>
              <InlineField label={tText("发放时机")} hint={POINTS_RULE_FIELD_HINTS.settle_timing}>
                <select className={inputCls} value={String(settings.settle_timing || "order_completed")} onChange={(e) => setSetting("settle_timing", e.target.value)}>
                  <option value="payment_success"><Tx>支付成功后</Tx></option>
                  <option value="order_shipped"><Tx>发货后</Tx></option>
                  <option value="order_completed"><Tx>订单完成后</Tx></option>
                </select>
              </InlineField>
              <InlineField label={tText("每多少 RM")} hint={POINTS_RULE_FIELD_HINTS.earn_currency_unit}>
                <input className={inputCls} type="number" step="0.01" min={0} value={String(settings.earn_currency_unit ?? 1)} onChange={(e) => setSetting("earn_currency_unit", e.target.value)} />
              </InlineField>
              <InlineField label={tText("获得多少积分")} hint={POINTS_RULE_FIELD_HINTS.earn_points_unit}>
                <input className={inputCls} type="number" min={0} value={String(settings.earn_points_unit ?? 1)} onChange={(e) => setSetting("earn_points_unit", e.target.value)} />
              </InlineField>
              <InlineField label={tText("取整方式")} hint={POINTS_RULE_FIELD_HINTS.earn_rounding}>
                <select className={inputCls} value={String(settings.earn_rounding || "floor")} onChange={(e) => setSetting("earn_rounding", e.target.value)}>
                  <option value="floor"><Tx>向下取整</Tx></option>
                  <option value="round"><Tx>四舍五入</Tx></option>
                  <option value="ceil"><Tx>向上取整</Tx></option>
                </select>
              </InlineField>
            </fieldset>
            <fieldset
              disabled={!settings.earn_enabled}
              className={cn("mt-3 grid gap-2 border-0 p-0 sm:grid-cols-2", !settings.earn_enabled && "opacity-50")}
            >
              <ToggleRow
                label={tText("优惠后金额积分")}
                hint={POINTS_RULE_FIELD_HINTS.earn_after_discount}
                checked={!!settings.earn_after_discount}
                onChange={(v) => setSetting("earn_after_discount", v)}
              />
              <ToggleRow
                label={tText("积分抵扣后再计分")}
                hint={POINTS_RULE_FIELD_HINTS.earn_after_points_redeem}
                checked={!!settings.earn_after_points_redeem}
                onChange={(v) => setSetting("earn_after_points_redeem", v)}
              />
            </fieldset>
          </SettingsSection>

          <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
            <button
              type="button"
              onClick={() => saveSettingsMutation.mutate()}
              disabled={saveSettingsMutation.isPending}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
            >
              <Save className="h-4 w-4" />
              <Tx>保存积分规则</Tx>
            </button>
          </div>
        </div>
      ) : null}

      {tab === "商品积分规则" ? (
        <div className="space-y-4">
          <div className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-5">
            <AdminSectionTitle
              title={<Tx>新增 / 编辑商品积分规则</Tx>}
              hint={POINTS_TAB_HINTS["商品积分规则"]}
            />
            <div className="grid gap-3 lg:grid-cols-2">
              <InlineField label={tText("规则名称")} hint={POINTS_PRODUCT_RULE_HINTS.name}><input className={inputCls} value={ruleForm.name} onChange={(e) => setRuleForm((s) => ({ ...s, name: e.target.value }))} /></InlineField>
              <InlineField label={tText("适用范围")} hint={POINTS_PRODUCT_RULE_HINTS.scope_type}><select className={inputCls} value={ruleForm.scope_type} onChange={(e) => setRuleForm((s) => ({ ...s, scope_type: e.target.value }))}><option value="all"><Tx>全部商品</Tx></option><option value="category"><Tx>指定分类</Tx></option><option value="product"><Tx>指定商品</Tx></option><option value="tag"><Tx>指定标签</Tx></option></select></InlineField>
              <InlineField label={tText("范围 ID")} hint={POINTS_PRODUCT_RULE_HINTS.scope_id}><input className={inputCls} value={String(ruleForm.scope_id || "")} onChange={(e) => setRuleForm((s) => ({ ...s, scope_id: e.target.value }))} /></InlineField>
              <InlineField label={tText("积分模式")} hint={POINTS_PRODUCT_RULE_HINTS.earn_mode}><select className={inputCls} value={ruleForm.earn_mode} onChange={(e) => setRuleForm((s) => ({ ...s, earn_mode: e.target.value }))}><option value="inherit"><Tx>继承全局</Tx></option><option value="no_points"><Tx>不积分</Tx></option><option value="fixed_per_item"><Tx>每件固定积分</Tx></option><option value="fixed_per_order"><Tx>每单固定积分</Tx></option><option value="amount_percent"><Tx>实付金额百分比</Tx></option><option value="price_percent"><Tx>售价百分比</Tx></option><option value="multiplier"><Tx>全局规则倍率</Tx></option></select></InlineField>
              <InlineField label={tText("固定积分")} hint={POINTS_PRODUCT_RULE_HINTS.fixed_points}><input className={inputCls} type="number" value={String(ruleForm.fixed_points || 0)} onChange={(e) => setRuleForm((s) => ({ ...s, fixed_points: Number(e.target.value) }))} /></InlineField>
              <InlineField label={tText("百分比")} hint={POINTS_PRODUCT_RULE_HINTS.points_percent}><input className={inputCls} type="number" value={String(ruleForm.points_percent || 0)} onChange={(e) => setRuleForm((s) => ({ ...s, points_percent: Number(e.target.value) }))} /></InlineField>
              <InlineField label={tText("倍率百分比")} hint={POINTS_PRODUCT_RULE_HINTS.multiplier_percent}><input className={inputCls} type="number" value={String(ruleForm.multiplier_percent || 100)} onChange={(e) => setRuleForm((s) => ({ ...s, multiplier_percent: Number(e.target.value) }))} /></InlineField>
              <InlineField label={tText("优先级")} hint={POINTS_PRODUCT_RULE_HINTS.priority}><input className={inputCls} type="number" value={String(ruleForm.priority || 100)} onChange={(e) => setRuleForm((s) => ({ ...s, priority: Number(e.target.value) }))} /></InlineField>
              <InlineField label={tText("最多抵扣比例")} hint={POINTS_PRODUCT_RULE_HINTS.max_redeem_percent}><input className={inputCls} type="number" value={String(ruleForm.max_redeem_percent ?? "")} onChange={(e) => setRuleForm((s) => ({ ...s, max_redeem_percent: e.target.value === "" ? null : Number(e.target.value) }))} /></InlineField>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <ToggleRow label={tText("允许获得积分")} hint={POINTS_PRODUCT_RULE_HINTS.earn_enabled} checked={!!ruleForm.earn_enabled} onChange={(v) => setRuleForm((s) => ({ ...s, earn_enabled: v }))} />
              <ToggleRow label={tText("允许积分抵扣")} hint={POINTS_PRODUCT_RULE_HINTS.redeem_enabled} checked={!!ruleForm.redeem_enabled} onChange={(v) => setRuleForm((s) => ({ ...s, redeem_enabled: v }))} />
              <ToggleRow label={tText("启用")} hint={POINTS_PRODUCT_RULE_HINTS.enabled} checked={!!ruleForm.enabled} onChange={(v) => setRuleForm((s) => ({ ...s, enabled: v }))} />
            </div>
            <button type="button" onClick={() => saveRuleMutation.mutate()} disabled={saveRuleMutation.isPending} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"><Plus className="h-4 w-4" />{ruleForm.id ? "保存规则" : "新增规则"}</button>
          </div>
          <AnimatedTable
            embedded
            loading={loading}
            rows={rules}
            rowKey={(r) => String(r.id || r.name)}
            skeletonRows={6}
            skeletonCols={10}
            className="overflow-x-auto rounded-xl border border-border bg-card"
            tableClassName="min-w-[980px] w-full text-sm"
            theadClassName="bg-secondary text-muted-foreground"
            thead={(
              <tr>
                {["名称", "范围", "模式", "固定", "百分比", "倍率", "可抵扣", "优先级", "状态", "操作"].map((h) => (
                  <th key={h} className={adminThClassName(h === "操作" ? "text-right" : undefined)}><Tx>{h}</Tx></th>
                ))}
              </tr>
            )}
            emptyIcon={Coins}
            emptyTitle="暂无商品积分规则"
            emptyDescription="填写上方表单并保存后，规则会显示在此列表。"
            renderMobileCard={renderRuleMobileCard}
            renderRow={(r) => (
              <>
                <td className={adminTdClassName()}>{r.name}</td>
                <td className={adminTdClassName()}>{r.scope_type}:{r.scope_id || "all"}</td>
                <td className={adminTdClassName(ADMIN_TABLE_NOWRAP_CLASS)}>{r.earn_mode}</td>
                <td className={adminTdClassName(ADMIN_TABLE_NOWRAP_CLASS)}>{r.fixed_points || 0}</td>
                <td className={adminTdClassName(ADMIN_TABLE_NOWRAP_CLASS)}>{r.points_percent || 0}</td>
                <td className={adminTdClassName(ADMIN_TABLE_NOWRAP_CLASS)}>{r.multiplier_percent || 100}</td>
                <td className={adminTdClassName(ADMIN_TABLE_NOWRAP_CLASS)}>{r.redeem_enabled ? "是" : "否"}</td>
                <td className={adminTdClassName(ADMIN_TABLE_NOWRAP_CLASS)}>{r.priority}</td>
                <td className={adminTdClassName()}>{r.enabled ? "启用" : "停用"}</td>
                <td className={adminTdClassName("text-right")}>
                  <button type="button" onClick={() => editRule(r)} className="mr-2 text-theme-price"><Tx>编辑</Tx></button>
                  <button type="button" onClick={() => r.id && deleteRuleMutation.mutate(r.id)} className="inline-flex items-center text-destructive"><Trash2 className="h-4 w-4" /></button>
                </td>
              </>
            )}
          />
        </div>
      ) : null}

      {tab === "积分抵扣" ? (
        <div className="space-y-6 rounded-xl border border-border bg-card p-4 sm:p-5">
          <SettingsSection
            title={tText("抵扣比例与门槛")}
            hint={<Tx>与「积分规则」页顶部的「开启积分抵扣」开关配合生效。</Tx>}
          >
            <fieldset disabled={!settings.redeem_enabled} className={cn("grid min-w-0 gap-3 border-0 p-0 lg:grid-cols-2", !settings.redeem_enabled && "opacity-50")}>
              <InlineField label={tText("1 积分等于 RM")} hint={POINTS_REDEEM_FIELD_HINTS.point_value_myr}>
                <input className={inputCls} type="number" step="0.0001" min={0} value={String(settings.point_value_myr ?? 0.01)} onChange={(e) => setSetting("point_value_myr", e.target.value)} />
              </InlineField>
              <InlineField label={tText("多少积分抵扣 RM1")} hint={POINTS_REDEEM_FIELD_HINTS.points_per_currency}>
                <input className={inputCls} type="number" min={0} value={String(settings.points_per_currency ?? 100)} onChange={(e) => setSetting("points_per_currency", e.target.value)} />
              </InlineField>
              <InlineField label={tText("最低使用积分")} hint={POINTS_REDEEM_FIELD_HINTS.min_redeem_points}>
                <input className={inputCls} type="number" min={0} value={String(settings.min_redeem_points ?? 10)} onChange={(e) => setSetting("min_redeem_points", e.target.value)} />
              </InlineField>
              <InlineField label={tText("使用积分步长")} hint={POINTS_REDEEM_FIELD_HINTS.redeem_step}>
                <input className={inputCls} type="number" min={1} value={String(settings.redeem_step ?? 1)} onChange={(e) => setSetting("redeem_step", e.target.value)} />
              </InlineField>
              <InlineField label={tText("单笔最多抵扣百分比")} hint={POINTS_REDEEM_FIELD_HINTS.max_redeem_percent}>
                <input className={inputCls} type="number" min={0} max={100} value={String(settings.max_redeem_percent ?? 30)} onChange={(e) => setSetting("max_redeem_percent", e.target.value)} />
              </InlineField>
              <InlineField label={tText("单笔最多抵扣金额")} hint={POINTS_REDEEM_FIELD_HINTS.max_redeem_amount}>
                <input className={inputCls} type="number" min={0} value={String(settings.max_redeem_amount ?? 0)} onChange={(e) => setSetting("max_redeem_amount", e.target.value)} />
              </InlineField>
              <InlineField label={tText("最低订单金额")} hint={POINTS_REDEEM_FIELD_HINTS.min_order_amount}>
                <input className={inputCls} type="number" min={0} value={String(settings.min_order_amount ?? 0)} onChange={(e) => setSetting("min_order_amount", e.target.value)} />
              </InlineField>
              <InlineField label={tText("抵扣范围")} hint={POINTS_REDEEM_FIELD_HINTS.redeem_scope}>
                <select className={inputCls} value={String(settings.redeem_scope || "exclude_restricted")} onChange={(e) => setSetting("redeem_scope", e.target.value)}>
                  <option value="all"><Tx>全部商品</Tx></option>
                  <option value="product_rule"><Tx>按商品/分类规则</Tx></option>
                  <option value="exclude_restricted"><Tx>排除受监管商品</Tx></option>
                </select>
              </InlineField>
            </fieldset>
          </SettingsSection>
          <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
            <button
              type="button"
              onClick={() => saveSettingsMutation.mutate()}
              disabled={saveSettingsMutation.isPending}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
            >
              <Save className="h-4 w-4" />
              <Tx>保存抵扣设置</Tx>
            </button>
          </div>
        </div>
      ) : null}

      {tab === "礼品兑换" ? <AdminPointsGifts /> : null}

      {tab === "积分明细" ? <AdminPointsRecords /> : null}

      {tab === "手动调整" ? (
        <div className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-5">
          <AdminSectionTitle title={<Tx>手动调整用户积分</Tx>} hint={POINTS_TAB_HINTS["手动调整"]} />
          <div className="grid gap-3 lg:grid-cols-2">
            <InlineField label={tText("用户 ID")} hint={POINTS_ADJUST_FIELD_HINTS.userId}><input className={inputCls} value={adjustForm.userId} onChange={(e) => setAdjustForm((s) => ({ ...s, userId: e.target.value }))} /></InlineField>
            <InlineField label={tText("调整积分")} hint={POINTS_ADJUST_FIELD_HINTS.points}><input className={inputCls} type="number" value={adjustForm.points} onChange={(e) => setAdjustForm((s) => ({ ...s, points: e.target.value }))} /></InlineField>
            <InlineField label={tText("原因")} hint={POINTS_ADJUST_FIELD_HINTS.reason} className="lg:col-span-2"><input className={inputCls} value={adjustForm.reason} onChange={(e) => setAdjustForm((s) => ({ ...s, reason: e.target.value }))} /></InlineField>
          </div>
          <button type="button" onClick={() => adjustMutation.mutate()} disabled={adjustMutation.isPending} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"><Save className="h-4 w-4" /><Tx>提交调整</Tx></button>
        </div>
      ) : null}

      {tab === "高级设置" ? (
        <div className="space-y-6 rounded-xl border border-border bg-card p-4 sm:p-5">
          <SettingsSection title={tText("积分过期")}>
            <div className="grid gap-3 lg:grid-cols-2">
              <ToggleRow label={tText("启用积分过期")} hint={POINTS_ADVANCED_FIELD_HINTS.expire_enabled} checked={!!settings.expire_enabled} onChange={(v) => setSetting("expire_enabled", v)} />
              <InlineField label={tText("积分有效天数")} hint={POINTS_ADVANCED_FIELD_HINTS.expire_days} className={!settings.expire_enabled ? "opacity-55" : undefined}>
                <input className={inputCls} type="number" min={1} disabled={!settings.expire_enabled} value={String(settings.expire_days ?? 365)} onChange={(e) => setSetting("expire_days", e.target.value)} />
              </InlineField>
            </div>
          </SettingsSection>
          <SettingsSection title={tText("不计分场景")}>
            <div className="grid gap-2 sm:grid-cols-2">
              <ToggleRow label={tText("优惠券订单不积分")} hint={POINTS_ADVANCED_FIELD_HINTS.coupon_no_points} checked={!!settings.coupon_no_points} onChange={(v) => setSetting("coupon_no_points", v)} />
              <ToggleRow label={tText("促销商品不积分")} hint={POINTS_ADVANCED_FIELD_HINTS.promotion_no_points} checked={!!settings.promotion_no_points} onChange={(v) => setSetting("promotion_no_points", v)} />
              <ToggleRow label={tText("营销活动商品不积分")} hint={POINTS_ADVANCED_FIELD_HINTS.marketing_activity_no_points} checked={!!settings.marketing_activity_no_points} onChange={(v) => setSetting("marketing_activity_no_points", v)} />
              <ToggleRow label={tText("会员价商品不积分")} hint={POINTS_ADVANCED_FIELD_HINTS.member_price_no_points} checked={!!settings.member_price_no_points} onChange={(v) => setSetting("member_price_no_points", v)} />
            </div>
          </SettingsSection>
          <SettingsSection title={tText("叠加与调账")}>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <ToggleRow label={tText("允许与优惠券叠加抵扣")} hint={POINTS_ADVANCED_FIELD_HINTS.allow_with_coupon} checked={settings.allow_with_coupon !== false && settings.allow_with_coupon !== 0} onChange={(v) => setSetting("allow_with_coupon", v)} />
              <ToggleRow label={tText("允许与返现余额叠加")} hint={POINTS_ADVANCED_FIELD_HINTS.allow_with_reward_cash} checked={settings.allow_with_reward_cash !== false && settings.allow_with_reward_cash !== 0} onChange={(v) => setSetting("allow_with_reward_cash", v)} />
              <ToggleRow label={tText("允许积分为负数（后台调账）")} hint={POINTS_ADVANCED_FIELD_HINTS.allow_negative_points} checked={!!settings.allow_negative_points} onChange={(v) => setSetting("allow_negative_points", v)} />
            </div>
          </SettingsSection>
          <SettingsSection title={tText("支付方式限制")}>
            <div className="grid gap-3 lg:grid-cols-2">
              <InlineField label={tText("支付方式积分限制")} hint={POINTS_ADVANCED_FIELD_HINTS.payment_points_mode}>
                <select className={inputCls} value={String(settings.payment_points_mode || "all")} onChange={(e) => setSetting("payment_points_mode", e.target.value)}>
                  <option value="all"><Tx>全部支付方式</Tx></option>
                  <option value="disabled"><Tx>全部禁用</Tx></option>
                  <option value="include"><Tx>仅允许列表内</Tx></option>
                  <option value="exclude"><Tx>排除列表内</Tx></option>
                </select>
              </InlineField>
              <InlineField label={tText("支付方式列表（逗号分隔）")} hint={POINTS_ADVANCED_FIELD_HINTS.allowed_payment_methods}>
                <input
                  className={inputCls}
                  value={Array.isArray(settings.allowed_payment_methods) ? settings.allowed_payment_methods.join(",") : String(settings.allowed_payment_methods || "online,whatsapp")}
                  onChange={(e) => setSetting("allowed_payment_methods", e.target.value.split(",").map((x) => x.trim()).filter(Boolean))}
                />
              </InlineField>
            </div>
            <p className="text-xs text-muted-foreground">
              <Tx>积分过期任务每日自动执行（KL 时区）。生日/节日多倍请用「活动管理 → 积分多倍活动」。</Tx>
            </p>
          </SettingsSection>
          <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
            <button type="button" onClick={() => saveSettingsMutation.mutate()} disabled={saveSettingsMutation.isPending} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"><Save className="h-4 w-4" /><Tx>保存高级设置</Tx></button>
            <button
              type="button"
              onClick={() => expireRunMutation.mutate()}
              disabled={expireRunMutation.isPending || !settings.expire_enabled}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm text-foreground"
            >
              <RefreshCw className="h-4 w-4" />
              <Tx>立即执行过期扣减</Tx>
              <AdminFieldHint text={<Tx>手动触发一次过期扣减任务，用于测试或补跑；需已开启「启用积分过期」。</Tx>} />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
