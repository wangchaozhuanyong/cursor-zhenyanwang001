import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import { Tx } from "@/components/admin/AdminText";
import AdminFieldHint, { AdminPageTitle } from "@/components/admin/AdminFieldHint";
import AdminPointsRecords from "@/modules/admin/pages/user/AdminPointsRecords";
import {
  adjustUserPoints,
  createProductPointRule,
  fetchAdminPointsRecords,
  fetchPointsSettings,
  fetchProductPointRules,
  removeProductPointRule,
  savePointsSettings,
  saveProductPointRule,
  type LoyaltyPointsSettings,
  type ProductPointRule,
} from "@/services/admin/pointsService";

const inputCls = "rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground";
const labelCls = "text-xs font-medium text-muted-foreground";

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

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="grid gap-1"><span className={labelCls}><Tx>{label}</Tx></span>{children}</label>;
}

export default function AdminMarketingPoints() {
  const tabs = useMemo(() => ["积分总览", "积分规则", "商品积分规则", "积分抵扣", "积分明细", "手动调整", "高级设置"], []);
  const [tab, setTab] = useState(tabs[0]);
  const [settings, setSettings] = useState<LoyaltyPointsSettings>({});
  const [rules, setRules] = useState<ProductPointRule[]>([]);
  const [ruleForm, setRuleForm] = useState<ProductPointRule>(defaultRule);
  const [adjustForm, setAdjustForm] = useState({ userId: "", points: "", reason: "" });
  const [stats, setStats] = useState({ totalEarned: 0, totalDeducted: 0, totalRecords: 0, activeUsers: 0 });
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [nextSettings, nextRules, records] = await Promise.all([
        fetchPointsSettings(),
        fetchProductPointRules({ pageSize: 100 }),
        fetchAdminPointsRecords({ page: 1, pageSize: 5 }),
      ]);
      setSettings(nextSettings || {});
      setRules(nextRules?.list || []);
      setStats(records.stats || { totalEarned: 0, totalDeducted: 0, totalRecords: 0, activeUsers: 0 });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "加载积分管理数据失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

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

  const saveSettings = async () => {
    const pointValue = Number(settings.point_value_myr || 0);
    const step = Number(settings.redeem_step || 1);
    if (pointValue <= 0 || step <= 0) {
      toast.error("积分抵扣比例和使用步长必须大于 0");
      return;
    }
    const saved = await savePointsSettings(settings);
    setSettings(saved);
    toast.success("积分设置已保存");
  };

  const saveRule = async () => {
    if (!ruleForm.name?.trim()) {
      toast.error("请输入规则名称");
      return;
    }
    const saved = ruleForm.id ? await saveProductPointRule(ruleForm.id, ruleForm) : await createProductPointRule(ruleForm);
    setRuleForm(defaultRule);
    await load();
    toast.success(saved?.id ? "商品积分规则已保存" : "规则已保存");
  };

  const editRule = (rule: ProductPointRule) => setRuleForm({ ...defaultRule, ...rule });

  const deleteRule = async (id?: string) => {
    if (!id) return;
    await removeProductPointRule(id);
    await load();
    toast.success("规则已停用");
  };

  const submitAdjust = async () => {
    const amount = Number(adjustForm.points);
    if (!adjustForm.userId || !Number.isFinite(amount) || amount === 0 || !adjustForm.reason.trim()) {
      toast.error("请填写用户 ID、调整积分和原因");
      return;
    }
    await adjustUserPoints(adjustForm.userId, amount, adjustForm.reason);
    setAdjustForm({ userId: "", points: "", reason: "" });
    await load();
    toast.success("积分已调整");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <AdminPageTitle
            title={<Tx>活动管理 / 积分管理</Tx>}
            hint={<Tx>订单积分、商品规则、抵扣比例和积分流水统一在这里维护。</Tx>}
          />
        </div>
        <button onClick={load} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-foreground" disabled={loading}><RefreshCw className="h-4 w-4" />刷新</button>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => <button key={t} onClick={() => setTab(t)} className={`rounded-lg px-3 py-1.5 text-sm ${tab === t ? "bg-gold/15 text-theme-price" : "bg-secondary text-muted-foreground"}`}>{t}</button>)}
      </div>

      {tab === "积分总览" ? (
        <div className="grid gap-3 md:grid-cols-4">
          {[["累计发放积分", stats.totalEarned], ["累计使用/回滚积分", stats.totalDeducted], ["积分流水数", stats.totalRecords], ["积分活跃用户", stats.activeUsers]].map(([k, v]) => (
            <div key={k} className="rounded-xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground"><Tx>{String(k)}</Tx></p><p className="mt-2 text-2xl font-semibold text-foreground">{String(v)}</p></div>
          ))}
        </div>
      ) : null}

      {tab === "积分规则" ? (
        <div className="grid gap-4 rounded-xl border border-border bg-card p-4 md:grid-cols-3">
          <Field label="用户端显示积分入口"><input type="checkbox" checked={!!settings.display_enabled} onChange={(e) => setSetting("display_enabled", e.target.checked)} /></Field>
          <Field label="开启消费积分"><input type="checkbox" checked={!!settings.earn_enabled} onChange={(e) => setSetting("earn_enabled", e.target.checked)} /></Field>
          <Field label="开启积分抵扣"><input type="checkbox" checked={!!settings.redeem_enabled} onChange={(e) => setSetting("redeem_enabled", e.target.checked)} /></Field>
          <Field label="积分计算方式"><select className={inputCls} value={String(settings.earn_mode || "amount_plus_product_rule")} onChange={(e) => setSetting("earn_mode", e.target.value)}><option value="amount">按金额积分</option><option value="product_rule">商品/分类规则积分</option><option value="amount_plus_product_rule">金额规则 + 商品特殊规则</option></select></Field>
          <Field label="每多少 RM"><input className={inputCls} type="number" step="0.01" value={String(settings.earn_currency_unit ?? 1)} onChange={(e) => setSetting("earn_currency_unit", e.target.value)} /></Field>
          <Field label="获得多少积分"><input className={inputCls} type="number" value={String(settings.earn_points_unit ?? 1)} onChange={(e) => setSetting("earn_points_unit", e.target.value)} /></Field>
          <Field label="取整方式"><select className={inputCls} value={String(settings.earn_rounding || "floor")} onChange={(e) => setSetting("earn_rounding", e.target.value)}><option value="floor">向下取整</option><option value="round">四舍五入</option><option value="ceil">向上取整</option></select></Field>
          <Field label="优惠后金额积分"><input type="checkbox" checked={!!settings.earn_after_discount} onChange={(e) => setSetting("earn_after_discount", e.target.checked)} /></Field>
          <Field label="发放时机"><select className={inputCls} value={String(settings.settle_timing || "order_completed")} onChange={(e) => setSetting("settle_timing", e.target.value)}><option value="payment_success">支付成功后</option><option value="order_shipped">发货后</option><option value="order_completed">订单完成后</option></select></Field>
          <button onClick={saveSettings} className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground md:col-span-3"><Save className="h-4 w-4" />保存积分规则</button>
        </div>
      ) : null}

      {tab === "商品积分规则" ? (
        <div className="space-y-4">
          <div className="grid gap-3 rounded-xl border border-border bg-card p-4 md:grid-cols-4">
            <Field label="规则名称"><input className={inputCls} value={ruleForm.name} onChange={(e) => setRuleForm((s) => ({ ...s, name: e.target.value }))} /></Field>
            <Field label="适用范围"><select className={inputCls} value={ruleForm.scope_type} onChange={(e) => setRuleForm((s) => ({ ...s, scope_type: e.target.value }))}><option value="all">全部商品</option><option value="category">指定分类</option><option value="product">指定商品</option><option value="tag">指定标签</option></select></Field>
            <Field label="范围 ID"><input className={inputCls} value={String(ruleForm.scope_id || "")} onChange={(e) => setRuleForm((s) => ({ ...s, scope_id: e.target.value }))} /></Field>
            <Field label="积分模式"><select className={inputCls} value={ruleForm.earn_mode} onChange={(e) => setRuleForm((s) => ({ ...s, earn_mode: e.target.value }))}><option value="inherit">继承全局</option><option value="no_points">不积分</option><option value="fixed_per_item">每件固定积分</option><option value="fixed_per_order">每单固定积分</option><option value="amount_percent">实付金额百分比</option><option value="price_percent">售价百分比</option><option value="multiplier">全局规则倍率</option></select></Field>
            <Field label="固定积分"><input className={inputCls} type="number" value={String(ruleForm.fixed_points || 0)} onChange={(e) => setRuleForm((s) => ({ ...s, fixed_points: Number(e.target.value) }))} /></Field>
            <Field label="百分比"><input className={inputCls} type="number" value={String(ruleForm.points_percent || 0)} onChange={(e) => setRuleForm((s) => ({ ...s, points_percent: Number(e.target.value) }))} /></Field>
            <Field label="倍率百分比"><input className={inputCls} type="number" value={String(ruleForm.multiplier_percent || 100)} onChange={(e) => setRuleForm((s) => ({ ...s, multiplier_percent: Number(e.target.value) }))} /></Field>
            <Field label="优先级"><input className={inputCls} type="number" value={String(ruleForm.priority || 100)} onChange={(e) => setRuleForm((s) => ({ ...s, priority: Number(e.target.value) }))} /></Field>
            <Field label="允许获得积分"><input type="checkbox" checked={!!ruleForm.earn_enabled} onChange={(e) => setRuleForm((s) => ({ ...s, earn_enabled: e.target.checked }))} /></Field>
            <Field label="允许积分抵扣"><input type="checkbox" checked={!!ruleForm.redeem_enabled} onChange={(e) => setRuleForm((s) => ({ ...s, redeem_enabled: e.target.checked }))} /></Field>
            <Field label="最多抵扣比例"><input className={inputCls} type="number" value={String(ruleForm.max_redeem_percent ?? "")} onChange={(e) => setRuleForm((s) => ({ ...s, max_redeem_percent: e.target.value === "" ? null : Number(e.target.value) }))} /></Field>
            <Field label="启用"><input type="checkbox" checked={!!ruleForm.enabled} onChange={(e) => setRuleForm((s) => ({ ...s, enabled: e.target.checked }))} /></Field>
            <button onClick={saveRule} className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground md:col-span-4"><Plus className="h-4 w-4" />{ruleForm.id ? "保存规则" : "新增规则"}</button>
          </div>
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="min-w-[980px] w-full text-sm"><thead className="bg-secondary text-muted-foreground"><tr>{["名称", "范围", "模式", "固定", "百分比", "倍率", "可抵扣", "优先级", "状态", "操作"].map((h) => <th key={h} className="px-3 py-2 text-left"><Tx>{h}</Tx></th>)}</tr></thead><tbody>{rules.map((r) => <tr key={r.id} className="border-t border-border"><td className="px-3 py-2 text-foreground">{r.name}</td><td className="px-3 py-2">{r.scope_type}:{r.scope_id || "all"}</td><td className="px-3 py-2">{r.earn_mode}</td><td className="px-3 py-2">{r.fixed_points || 0}</td><td className="px-3 py-2">{r.points_percent || 0}</td><td className="px-3 py-2">{r.multiplier_percent || 100}</td><td className="px-3 py-2">{r.redeem_enabled ? "是" : "否"}</td><td className="px-3 py-2">{r.priority}</td><td className="px-3 py-2">{r.enabled ? "启用" : "停用"}</td><td className="px-3 py-2"><button onClick={() => editRule(r)} className="mr-2 text-theme-price">编辑</button><button onClick={() => deleteRule(r.id)} className="inline-flex items-center text-destructive"><Trash2 className="h-4 w-4" /></button></td></tr>)}</tbody></table>
          </div>
        </div>
      ) : null}

      {tab === "积分抵扣" ? (
        <div className="grid gap-4 rounded-xl border border-border bg-card p-4 md:grid-cols-3">
          <Field label="1 积分等于 RM"><input className={inputCls} type="number" step="0.0001" value={String(settings.point_value_myr ?? 0.01)} onChange={(e) => setSetting("point_value_myr", e.target.value)} /></Field>
          <Field label="多少积分抵扣 RM1"><input className={inputCls} type="number" value={String(settings.points_per_currency ?? 100)} onChange={(e) => setSetting("points_per_currency", e.target.value)} /></Field>
          <Field label="最低使用积分"><input className={inputCls} type="number" value={String(settings.min_redeem_points ?? 10)} onChange={(e) => setSetting("min_redeem_points", e.target.value)} /></Field>
          <Field label="使用积分步长"><input className={inputCls} type="number" value={String(settings.redeem_step ?? 1)} onChange={(e) => setSetting("redeem_step", e.target.value)} /></Field>
          <Field label="单笔最多抵扣百分比"><input className={inputCls} type="number" value={String(settings.max_redeem_percent ?? 30)} onChange={(e) => setSetting("max_redeem_percent", e.target.value)} /></Field>
          <Field label="单笔最多抵扣金额"><input className={inputCls} type="number" value={String(settings.max_redeem_amount ?? 0)} onChange={(e) => setSetting("max_redeem_amount", e.target.value)} /></Field>
          <Field label="最低订单金额"><input className={inputCls} type="number" value={String(settings.min_order_amount ?? 0)} onChange={(e) => setSetting("min_order_amount", e.target.value)} /></Field>
          <Field label="抵扣范围"><select className={inputCls} value={String(settings.redeem_scope || "exclude_restricted")} onChange={(e) => setSetting("redeem_scope", e.target.value)}><option value="all">全部商品</option><option value="product_rule">按商品/分类规则</option><option value="exclude_restricted">排除受监管商品</option></select></Field>
          <button onClick={saveSettings} className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground md:col-span-3"><Save className="h-4 w-4" />保存抵扣设置</button>
        </div>
      ) : null}

      {tab === "积分明细" ? <AdminPointsRecords /> : null}

      {tab === "手动调整" ? (
        <div className="grid gap-4 rounded-xl border border-border bg-card p-4 md:grid-cols-3">
          <Field label="用户 ID"><input className={inputCls} value={adjustForm.userId} onChange={(e) => setAdjustForm((s) => ({ ...s, userId: e.target.value }))} /></Field>
          <Field label="调整积分"><input className={inputCls} type="number" value={adjustForm.points} onChange={(e) => setAdjustForm((s) => ({ ...s, points: e.target.value }))} /></Field>
          <Field label="原因"><input className={inputCls} value={adjustForm.reason} onChange={(e) => setAdjustForm((s) => ({ ...s, reason: e.target.value }))} /></Field>
          <button onClick={submitAdjust} className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground md:col-span-3"><Save className="h-4 w-4" />提交调整</button>
        </div>
      ) : null}

      {tab === "高级设置" ? (
        <div className="flex items-center gap-2 rounded-xl border border-dashed border-border bg-card px-4 py-3 text-sm text-foreground">
          <Tx>高级设置</Tx>
          <AdminFieldHint text={<Tx>积分有效期、生日多倍积分、节日多倍积分、会员等级自动升级、积分兑换礼品为预留功能；当前不会影响订单积分主流程。</Tx>} />
        </div>
      ) : null}
    </div>
  );
}
