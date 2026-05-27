import { Save } from "lucide-react";
import { Tx } from "@/components/admin/AdminText";
import {
  adminFormInputCls,
  AdminInlineField,
  AdminSettingsSection,
  AdminToggleRow,
} from "@/components/admin/forms/AdminFormFields";
import {
  POINTS_RULE_FIELD_HINTS,
  POINTS_SECTION_HINTS,
} from "@/modules/admin/pages/marketing/adminPointsHints";
import type { LoyaltyPointsSettings } from "@/services/admin/pointsService";
import { cn } from "@/lib/utils";

type Props = {
  settings: LoyaltyPointsSettings;
  setSetting: (key: string, value: string | number | boolean | string[]) => void;
  onSave: () => void;
  saving: boolean;
  tText: (zh: string) => string;
};

export default function PointsLoyaltySettingsTab({ settings, setSetting, onSave, saving, tText }: Props) {
  return (
    <div className="space-y-6 rounded-xl border border-border bg-card p-4 sm:p-5">
      <AdminSettingsSection title={tText("功能开关")} sectionHint={POINTS_SECTION_HINTS["功能开关"]}>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <AdminToggleRow
            label={tText("用户端显示积分入口")}
            hint={POINTS_RULE_FIELD_HINTS.display_enabled}
            checked={!!settings.display_enabled}
            onChange={(v) => setSetting("display_enabled", v)}
          />
          <AdminToggleRow
            label={tText("开启消费积分")}
            hint={POINTS_RULE_FIELD_HINTS.earn_enabled}
            checked={!!settings.earn_enabled}
            onChange={(v) => setSetting("earn_enabled", v)}
          />
          <AdminToggleRow
            label={tText("开启积分抵扣")}
            hint={POINTS_RULE_FIELD_HINTS.redeem_enabled}
            checked={!!settings.redeem_enabled}
            onChange={(v) => setSetting("redeem_enabled", v)}
          />
        </div>
      </AdminSettingsSection>

      <AdminSettingsSection
        title={tText("消费积分规则")}
        sectionHint={POINTS_SECTION_HINTS["消费积分规则"]}
        hint={<Tx>按金额与商品规则计算订单积分；关闭「开启消费积分」后前台不再发放消费积分。</Tx>}
      >
        <fieldset
          disabled={!settings.earn_enabled}
          className={cn("grid min-w-0 gap-3 border-0 p-0 lg:grid-cols-2", !settings.earn_enabled && "opacity-50")}
        >
          <AdminInlineField label={tText("积分计算方式")} hint={POINTS_RULE_FIELD_HINTS.earn_mode}>
            <select className={adminFormInputCls} value={String(settings.earn_mode || "amount_plus_product_rule")} onChange={(e) => setSetting("earn_mode", e.target.value)}>
              <option value="amount"><Tx>按金额积分</Tx></option>
              <option value="product_rule"><Tx>商品/分类规则积分</Tx></option>
              <option value="amount_plus_product_rule"><Tx>金额规则 + 商品特殊规则</Tx></option>
            </select>
          </AdminInlineField>
          <AdminInlineField label={tText("发放时机")} hint={POINTS_RULE_FIELD_HINTS.settle_timing}>
            <select className={adminFormInputCls} value={String(settings.settle_timing || "order_completed")} onChange={(e) => setSetting("settle_timing", e.target.value)}>
              <option value="payment_success"><Tx>支付成功后</Tx></option>
              <option value="order_shipped"><Tx>发货后</Tx></option>
              <option value="order_completed"><Tx>订单完成后</Tx></option>
            </select>
          </AdminInlineField>
          <AdminInlineField label={tText("每多少 RM")} hint={POINTS_RULE_FIELD_HINTS.earn_currency_unit}>
            <input className={adminFormInputCls} type="number" step="0.01" min={0} value={String(settings.earn_currency_unit ?? 1)} onChange={(e) => setSetting("earn_currency_unit", e.target.value)} />
          </AdminInlineField>
          <AdminInlineField label={tText("获得多少积分")} hint={POINTS_RULE_FIELD_HINTS.earn_points_unit}>
            <input className={adminFormInputCls} type="number" min={0} value={String(settings.earn_points_unit ?? 1)} onChange={(e) => setSetting("earn_points_unit", e.target.value)} />
          </AdminInlineField>
          <AdminInlineField label={tText("取整方式")} hint={POINTS_RULE_FIELD_HINTS.earn_rounding}>
            <select className={adminFormInputCls} value={String(settings.earn_rounding || "floor")} onChange={(e) => setSetting("earn_rounding", e.target.value)}>
              <option value="floor"><Tx>向下取整</Tx></option>
              <option value="round"><Tx>四舍五入</Tx></option>
              <option value="ceil"><Tx>向上取整</Tx></option>
            </select>
          </AdminInlineField>
        </fieldset>
        <fieldset
          disabled={!settings.earn_enabled}
          className={cn("mt-3 grid gap-2 border-0 p-0 sm:grid-cols-2", !settings.earn_enabled && "opacity-50")}
        >
          <AdminToggleRow
            label={tText("优惠后金额积分")}
            hint={POINTS_RULE_FIELD_HINTS.earn_after_discount}
            checked={!!settings.earn_after_discount}
            onChange={(v) => setSetting("earn_after_discount", v)}
          />
          <AdminToggleRow
            label={tText("积分抵扣后再计分")}
            hint={POINTS_RULE_FIELD_HINTS.earn_after_points_redeem}
            onChange={(v) => setSetting("earn_after_points_redeem", v)}
            checked={!!settings.earn_after_points_redeem}
          />
        </fieldset>
      </AdminSettingsSection>

      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
        >
          <Save className="h-4 w-4" />
          <Tx>保存全局积分设置</Tx>
        </button>
      </div>
    </div>
  );
}
