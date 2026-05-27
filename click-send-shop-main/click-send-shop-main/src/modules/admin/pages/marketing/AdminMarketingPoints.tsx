import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Coins, Plus, RefreshCw, Trash2 } from "lucide-react";
import { AnimatedTable } from "@/modules/micro-interactions";
import {
  AdminTableMobileCard,
  AdminTableMobileCardField,
} from "@/components/admin/AdminTableMobileCard";
import { ADMIN_TABLE_NOWRAP_CLASS, adminTdClassName, adminThClassName } from "@/utils/adminTableClasses";
import { Tx } from "@/components/admin/AdminText";
import AdminFieldHint, { AdminSectionTitle } from "@/components/admin/AdminFieldHint";
import AdminPageShell from "@/components/admin/AdminPageShell";
import {
  adminFormInputCls,
  AdminInlineField,
  AdminToggleRow,
} from "@/components/admin/forms/AdminFormFields";
import {
  POINTS_PRODUCT_RULE_HINTS,
  POINTS_TAB_HINTS,
} from "@/modules/admin/pages/marketing/adminPointsHints";
import PointsOverviewTab from "@/modules/admin/pages/marketing/points/tabs/PointsOverviewTab";
import PointsLoyaltySettingsTab from "@/modules/admin/pages/marketing/points/tabs/PointsLoyaltySettingsTab";
import PointsRedeemTab from "@/modules/admin/pages/marketing/points/tabs/PointsRedeemTab";
import PointsManualAdjustTab from "@/modules/admin/pages/marketing/points/tabs/PointsManualAdjustTab";
import PointsAdvancedTab from "@/modules/admin/pages/marketing/points/tabs/PointsAdvancedTab";
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
import { useAdminPermissionStore } from "@/stores/useAdminPermissionStore";
const inputCls = adminFormInputCls;

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

export default function AdminMarketingPoints() {
  const { tText } = useAdminT();
  const isSuperAdmin = useAdminPermissionStore((s) => s.isSuperAdmin);
  const queryClient = useQueryClient();
  const tabs = useMemo(
    () => ["积分总览", "全局积分设置", "商品积分规则", "积分抵扣", "礼品兑换", "积分明细", "手动调整", "高级设置"] as const,
    [],
  );
  const visibleTabs = useMemo(
    () => tabs.filter((item) => isSuperAdmin || item !== "高级设置"),
    [isSuperAdmin, tabs],
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

  useEffect(() => {
    if (!visibleTabs.includes(tab)) {
      setTab(visibleTabs[0]);
    }
  }, [tab, visibleTabs]);

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
        throw new Error(tText("请填写用户编号、调整积分和原因"));
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
    <AdminPageShell
      hint={<Tx>订单积分、商品规则、抵扣比例和积分流水统一在这里维护。</Tx>}
      toolbar={(
        <button type="button" onClick={() => void invalidatePoints()} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-foreground" disabled={loading}><RefreshCw className="h-4 w-4" /><Tx>刷新</Tx></button>
      )}
      filters={(
      <div className="flex flex-wrap gap-2">
        {visibleTabs.map((t) => (
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
      )}
    >
      {tab === "积分总览" ? <PointsOverviewTab stats={stats} /> : null}

      {tab === "全局积分设置" ? (
        <PointsLoyaltySettingsTab
          settings={settings}
          setSetting={setSetting}
          onSave={() => saveSettingsMutation.mutate()}
          saving={saveSettingsMutation.isPending}
          tText={tText}
        />
      ) : null}

      {tab === "商品积分规则" ? (
        <div className="space-y-4">
          <div className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-5">
            <AdminSectionTitle
              title={<Tx>新增 / 编辑商品积分规则</Tx>}
              hint={POINTS_TAB_HINTS["商品积分规则"]}
            />
            {!isSuperAdmin ? (
              <div className="rounded-lg border border-dashed border-border bg-secondary/20 p-3 text-sm text-muted-foreground">
                <p><Tx>当前页已按员工常用配置展示。</Tx></p>
                <p className="mt-1"><Tx>指定分类/商品/标签编号、优先级和单独抵扣上限仅对超级管理员开放。</Tx></p>
              </div>
            ) : null}
            <div className="grid gap-3 lg:grid-cols-2">
              <AdminInlineField label={tText("规则名称")} hint={POINTS_PRODUCT_RULE_HINTS.name}><input className={inputCls} value={ruleForm.name} onChange={(e) => setRuleForm((s) => ({ ...s, name: e.target.value }))} /></AdminInlineField>
              <AdminInlineField label={tText("适用范围")} hint={POINTS_PRODUCT_RULE_HINTS.scope_type}><select className={inputCls} value={ruleForm.scope_type} onChange={(e) => setRuleForm((s) => ({ ...s, scope_type: e.target.value }))}><option value="all"><Tx>全部商品</Tx></option><option value="category" disabled={!isSuperAdmin}><Tx>指定分类</Tx></option><option value="product" disabled={!isSuperAdmin}><Tx>指定商品</Tx></option><option value="tag" disabled={!isSuperAdmin}><Tx>指定标签</Tx></option></select></AdminInlineField>
              <AdminInlineField label={tText("积分模式")} hint={POINTS_PRODUCT_RULE_HINTS.earn_mode}><select className={inputCls} value={ruleForm.earn_mode} onChange={(e) => setRuleForm((s) => ({ ...s, earn_mode: e.target.value }))}><option value="inherit"><Tx>继承全局</Tx></option><option value="no_points"><Tx>不积分</Tx></option><option value="fixed_per_item"><Tx>每件固定积分</Tx></option><option value="fixed_per_order"><Tx>每单固定积分</Tx></option><option value="amount_percent"><Tx>实付金额百分比</Tx></option><option value="price_percent"><Tx>售价百分比</Tx></option><option value="multiplier"><Tx>全局规则倍率</Tx></option></select></AdminInlineField>
              <AdminInlineField label={tText("固定积分")} hint={POINTS_PRODUCT_RULE_HINTS.fixed_points}><input className={inputCls} type="number" value={String(ruleForm.fixed_points || 0)} onChange={(e) => setRuleForm((s) => ({ ...s, fixed_points: Number(e.target.value) }))} /></AdminInlineField>
              <AdminInlineField label={tText("百分比")} hint={POINTS_PRODUCT_RULE_HINTS.points_percent}><input className={inputCls} type="number" value={String(ruleForm.points_percent || 0)} onChange={(e) => setRuleForm((s) => ({ ...s, points_percent: Number(e.target.value) }))} /></AdminInlineField>
              <AdminInlineField label={tText("倍率百分比")} hint={POINTS_PRODUCT_RULE_HINTS.multiplier_percent}><input className={inputCls} type="number" value={String(ruleForm.multiplier_percent || 100)} onChange={(e) => setRuleForm((s) => ({ ...s, multiplier_percent: Number(e.target.value) }))} /></AdminInlineField>
            </div>
            {isSuperAdmin ? (
              <div className="rounded-lg border border-border bg-secondary/20 p-4">
                <div className="mb-3">
                  <p className="text-sm font-medium text-foreground"><Tx>管理员高级设置</Tx></p>
                  <p className="mt-1 text-xs text-muted-foreground"><Tx>用于精确绑定分类/商品/标签编号，并控制命中优先级与局部抵扣上限。</Tx></p>
                </div>
                <div className="grid gap-3 lg:grid-cols-3">
                  <AdminInlineField label={tText("适用对象编号")} hint={POINTS_PRODUCT_RULE_HINTS.scope_id}><input className={inputCls} value={String(ruleForm.scope_id || "")} onChange={(e) => setRuleForm((s) => ({ ...s, scope_id: e.target.value }))} /></AdminInlineField>
                  <AdminInlineField label={tText("优先级")} hint={POINTS_PRODUCT_RULE_HINTS.priority}><input className={inputCls} type="number" value={String(ruleForm.priority || 100)} onChange={(e) => setRuleForm((s) => ({ ...s, priority: Number(e.target.value) }))} /></AdminInlineField>
                  <AdminInlineField label={tText("最多抵扣比例")} hint={POINTS_PRODUCT_RULE_HINTS.max_redeem_percent}><input className={inputCls} type="number" value={String(ruleForm.max_redeem_percent ?? "")} onChange={(e) => setRuleForm((s) => ({ ...s, max_redeem_percent: e.target.value === "" ? null : Number(e.target.value) }))} /></AdminInlineField>
                </div>
              </div>
            ) : null}
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <AdminToggleRow label={tText("允许获得积分")} hint={POINTS_PRODUCT_RULE_HINTS.earn_enabled} checked={!!ruleForm.earn_enabled} onChange={(v) => setRuleForm((s) => ({ ...s, earn_enabled: v }))} />
              <AdminToggleRow label={tText("允许积分抵扣")} hint={POINTS_PRODUCT_RULE_HINTS.redeem_enabled} checked={!!ruleForm.redeem_enabled} onChange={(v) => setRuleForm((s) => ({ ...s, redeem_enabled: v }))} />
              <AdminToggleRow label={tText("启用")} hint={POINTS_PRODUCT_RULE_HINTS.enabled} checked={!!ruleForm.enabled} onChange={(v) => setRuleForm((s) => ({ ...s, enabled: v }))} />
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
        <PointsRedeemTab
          settings={settings}
          setSetting={setSetting}
          onSave={() => saveSettingsMutation.mutate()}
          saving={saveSettingsMutation.isPending}
          tText={tText}
        />
      ) : null}

      {tab === "礼品兑换" ? <AdminPointsGifts /> : null}

      {tab === "积分明细" ? <AdminPointsRecords embedded /> : null}

      {tab === "手动调整" ? (
        <PointsManualAdjustTab
          adjustForm={adjustForm}
          setAdjustForm={setAdjustForm}
          onSubmit={() => adjustMutation.mutate()}
          submitting={adjustMutation.isPending}
          tText={tText}
        />
      ) : null}

      {tab === "高级设置" ? (
        <PointsAdvancedTab
          settings={settings}
          setSetting={setSetting}
          onSave={() => saveSettingsMutation.mutate()}
          onExpireRun={() => expireRunMutation.mutate()}
          saving={saveSettingsMutation.isPending}
          expireRunning={expireRunMutation.isPending}
          tText={tText}
        />
      ) : null}
    </AdminPageShell>
  );
}
