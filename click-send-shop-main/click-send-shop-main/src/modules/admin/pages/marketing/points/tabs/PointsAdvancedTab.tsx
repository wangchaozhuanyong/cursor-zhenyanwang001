import { RefreshCw, Save } from "lucide-react";
import { Tx } from "@/components/admin/AdminText";
import {
  adminFormInputCls,
  AdminInlineField,
  AdminSettingsSection,
  AdminToggleRow,
} from "@/components/admin/forms/AdminFormFields";
import { POINTS_ADVANCED_FIELD_HINTS, POINTS_SECTION_HINTS } from "@/modules/admin/pages/marketing/adminPointsHints";
import type { LoyaltyPointsSettings } from "@/api/admin/points";
import { cn } from "@/lib/utils";

const PAYMENT_METHOD_PRESETS = ["online", "whatsapp", "reward_wallet"] as const;

type Props = {
  settings: LoyaltyPointsSettings;
  setSetting: (key: string, value: string | number | boolean | string[]) => void;
  onSave: () => void;
  onExpireRun: () => void;
  saving: boolean;
  expireRunning: boolean;
  tText: (zh: string) => string;
};

function paymentMethodsValue(settings: LoyaltyPointsSettings): string {
  return Array.isArray(settings.allowed_payment_methods)
    ? settings.allowed_payment_methods.join(", ")
    : String(settings.allowed_payment_methods || "");
}

export default function PointsAdvancedTab({
  settings,
  setSetting,
  onSave,
  onExpireRun,
  saving,
  expireRunning,
  tText,
}: Props) {
  const expireEnabled = !!settings.expire_enabled;
  const paymentMode = String(settings.payment_points_mode || "all");
  const paymentListApplies = paymentMode === "include" || paymentMode === "exclude";
  const paymentMethods = paymentMethodsValue(settings);

  return (
    <div className="space-y-6 rounded-xl border border-border bg-card p-4 sm:p-5">
      <AdminSettingsSection title={tText("积分过期")} sectionHint={POINTS_SECTION_HINTS["积分过期"]}>
        <div className="max-w-2xl space-y-3">
          <AdminToggleRow
            label={tText("启用积分过期")}
            hint={POINTS_ADVANCED_FIELD_HINTS.expire_enabled}
            checked={expireEnabled}
            onChange={(v) => setSetting("expire_enabled", v)}
          />
          {expireEnabled ? (
            <div className="rounded-lg border border-dashed border-border bg-muted/25 px-3 py-3 sm:ml-7">
              <AdminInlineField label={tText("积分有效天数")} hint={POINTS_ADVANCED_FIELD_HINTS.expire_days}>
                <input
                  className={adminFormInputCls}
                  type="number"
                  min={1}
                  value={String(settings.expire_days ?? 365)}
                  onChange={(e) => setSetting("expire_days", e.target.value)}
                />
              </AdminInlineField>
            </div>
          ) : (
            <p className="text-xs leading-relaxed text-muted-foreground sm:ml-7">
              <Tx>关闭后不会自动扣减过期积分；下方「立即执行过期扣减」亦不可用。</Tx>
            </p>
          )}
          <p className="text-xs leading-relaxed text-muted-foreground">
            <Tx>积分过期任务每日自动执行（KL 时区）。生日/节日多倍请用「活动管理 → 积分多倍活动」。</Tx>
          </p>
        </div>
      </AdminSettingsSection>

      <AdminSettingsSection title={tText("不计分场景")} sectionHint={POINTS_SECTION_HINTS["不计分场景"]}>
        <div className="grid max-w-4xl gap-2 sm:grid-cols-2">
          <AdminToggleRow
            label={tText("优惠券订单不积分")}
            hint={POINTS_ADVANCED_FIELD_HINTS.coupon_no_points}
            checked={!!settings.coupon_no_points}
            onChange={(v) => setSetting("coupon_no_points", v)}
          />
          <AdminToggleRow
            label={tText("促销商品不积分")}
            hint={POINTS_ADVANCED_FIELD_HINTS.promotion_no_points}
            checked={!!settings.promotion_no_points}
            onChange={(v) => setSetting("promotion_no_points", v)}
          />
          <AdminToggleRow
            label={tText("营销活动商品不积分")}
            hint={POINTS_ADVANCED_FIELD_HINTS.marketing_activity_no_points}
            checked={!!settings.marketing_activity_no_points}
            onChange={(v) => setSetting("marketing_activity_no_points", v)}
          />
          <AdminToggleRow
            label={tText("会员价商品不积分")}
            hint={POINTS_ADVANCED_FIELD_HINTS.member_price_no_points}
            checked={!!settings.member_price_no_points}
            onChange={(v) => setSetting("member_price_no_points", v)}
          />
        </div>
      </AdminSettingsSection>

      <AdminSettingsSection title={tText("叠加与调账")} sectionHint={POINTS_SECTION_HINTS["叠加与调账"]}>
        <div className="grid max-w-3xl gap-2 sm:grid-cols-2">
          <AdminToggleRow
            label={tText("允许与优惠券叠加抵扣")}
            hint={POINTS_ADVANCED_FIELD_HINTS.allow_with_coupon}
            checked={settings.allow_with_coupon !== false && settings.allow_with_coupon !== 0}
            onChange={(v) => setSetting("allow_with_coupon", v)}
          />
          <AdminToggleRow
            label={tText("允许与返现余额叠加")}
            hint={POINTS_ADVANCED_FIELD_HINTS.allow_with_reward_cash}
            checked={settings.allow_with_reward_cash !== false && settings.allow_with_reward_cash !== 0}
            onChange={(v) => setSetting("allow_with_reward_cash", v)}
          />
          <AdminToggleRow
            label={tText("允许积分为负数（后台调账）")}
            hint={POINTS_ADVANCED_FIELD_HINTS.allow_negative_points}
            checked={!!settings.allow_negative_points}
            onChange={(v) => setSetting("allow_negative_points", v)}
          />
        </div>
      </AdminSettingsSection>

      <AdminSettingsSection title={tText("支付方式限制")} sectionHint={POINTS_SECTION_HINTS["支付方式限制"]}>
        <div className="max-w-2xl space-y-3">
          <AdminInlineField label={tText("支付方式积分限制")} hint={POINTS_ADVANCED_FIELD_HINTS.payment_points_mode}>
            <select
              className={adminFormInputCls}
              value={paymentMode}
              onChange={(e) => setSetting("payment_points_mode", e.target.value)}
            >
              <option value="all"><Tx>全部支付方式（不限制）</Tx></option>
              <option value="disabled"><Tx>全部禁用</Tx></option>
              <option value="include"><Tx>仅允许列表内</Tx></option>
              <option value="exclude"><Tx>排除列表内</Tx></option>
            </select>
          </AdminInlineField>

          {paymentMode === "all" ? (
            <p className="rounded-lg border border-border/80 bg-muted/20 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
              <Tx>所有支付方式均可获得积分、使用积分抵扣；下方支付方式列表不会生效，保存时仍保留以备切换模式。</Tx>
            </p>
          ) : null}

          {paymentMode === "disabled" ? (
            <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-900 dark:text-amber-100">
              <Tx>任意支付方式均不可获得积分或使用积分抵扣。</Tx>
            </p>
          ) : null}

          <AdminInlineField
            label={tText("支付方式列表（逗号分隔）")}
            hint={POINTS_ADVANCED_FIELD_HINTS.allowed_payment_methods}
            className={cn(!paymentListApplies && "opacity-50")}
          >
            <input
              className={adminFormInputCls}
              disabled={!paymentListApplies}
              placeholder={paymentListApplies ? "online, whatsapp" : undefined}
              value={paymentMethods}
              onChange={(e) =>
                setSetting(
                  "allowed_payment_methods",
                  e.target.value.split(",").map((x) => x.trim()).filter(Boolean),
                )
              }
            />
          </AdminInlineField>

          {paymentListApplies ? (
            <div className="flex flex-wrap gap-2 pl-1 sm:pl-[8.75rem]">
              {PAYMENT_METHOD_PRESETS.map((code) => {
                const active = paymentMethods.split(",").map((x) => x.trim()).includes(code);
                return (
                  <button
                    key={code}
                    type="button"
                    disabled={!paymentListApplies}
                    className={cn(
                      "rounded-md border px-2.5 py-1 text-xs font-medium transition",
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground hover:border-primary/40",
                    )}
                    onClick={() => {
                      const current = paymentMethods
                        .split(",")
                        .map((x) => x.trim())
                        .filter(Boolean);
                      const next = active
                        ? current.filter((x) => x !== code)
                        : [...current, code];
                      setSetting("allowed_payment_methods", next);
                    }}
                  >
                    {code}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      </AdminSettingsSection>

      <div className="flex flex-col gap-4 border-t border-border pt-4 sm:flex-row sm:items-start sm:justify-between">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground sm:w-auto"
        >
          <Save className="h-4 w-4" />
          <Tx>保存高级设置</Tx>
        </button>
        <div className="flex w-full flex-col gap-2 sm:max-w-sm sm:items-end">
          <button
            type="button"
            onClick={onExpireRun}
            disabled={expireRunning || !expireEnabled}
            className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            <RefreshCw className={cn("h-4 w-4", expireRunning && "animate-spin")} />
            <Tx>立即执行过期扣减</Tx>
          </button>
          <p className="text-xs leading-relaxed text-muted-foreground sm:text-right">
            <Tx>手动触发一次过期扣减，用于测试或补跑；需已开启「启用积分过期」。</Tx>
          </p>
        </div>
      </div>
    </div>
  );
}
