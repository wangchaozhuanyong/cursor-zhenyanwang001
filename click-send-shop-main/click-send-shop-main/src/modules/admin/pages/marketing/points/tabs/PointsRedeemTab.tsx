import { Save } from "lucide-react";
import { Tx } from "@/components/admin/AdminText";
import {
  adminFormInputCls,
  AdminInlineField,
  AdminSettingsSection,
} from "@/components/admin/forms/AdminFormFields";
import { POINTS_REDEEM_FIELD_HINTS, POINTS_SECTION_HINTS } from "@/modules/admin/pages/marketing/adminPointsHints";
import type { LoyaltyPointsSettings } from "@/services/admin/pointsService";
import { cn } from "@/lib/utils";

type Props = {
  settings: LoyaltyPointsSettings;
  setSetting: (key: string, value: string | number | boolean | string[]) => void;
  onSave: () => void;
  saving: boolean;
  tText: (zh: string) => string;
};

export default function PointsRedeemTab({ settings, setSetting, onSave, saving, tText }: Props) {
  return (
    <div className="space-y-6 rounded-xl border border-border bg-card p-4 sm:p-5">
      <AdminSettingsSection
        title={tText("抵扣比例与门槛")}
        sectionHint={POINTS_SECTION_HINTS["抵扣比例与门槛"]}
        hint={<Tx>与「全局积分设置」中的「开启积分抵扣」开关配合生效。</Tx>}
      >
        <fieldset disabled={!settings.redeem_enabled} className={cn("grid min-w-0 gap-3 border-0 p-0 lg:grid-cols-2", !settings.redeem_enabled && "opacity-50")}>
          <AdminInlineField label={tText("1 积分等于 RM")} hint={POINTS_REDEEM_FIELD_HINTS.point_value_myr}>
            <input className={adminFormInputCls} type="number" step="0.0001" min={0} value={String(settings.point_value_myr ?? 0.01)} onChange={(e) => setSetting("point_value_myr", e.target.value)} />
          </AdminInlineField>
          <AdminInlineField label={tText("多少积分抵扣 RM1")} hint={POINTS_REDEEM_FIELD_HINTS.points_per_currency}>
            <input className={adminFormInputCls} type="number" min={0} value={String(settings.points_per_currency ?? 100)} onChange={(e) => setSetting("points_per_currency", e.target.value)} />
          </AdminInlineField>
          <AdminInlineField label={tText("最低使用积分")} hint={POINTS_REDEEM_FIELD_HINTS.min_redeem_points}>
            <input className={adminFormInputCls} type="number" min={0} value={String(settings.min_redeem_points ?? 10)} onChange={(e) => setSetting("min_redeem_points", e.target.value)} />
          </AdminInlineField>
          <AdminInlineField label={tText("使用积分步长")} hint={POINTS_REDEEM_FIELD_HINTS.redeem_step}>
            <input className={adminFormInputCls} type="number" min={1} value={String(settings.redeem_step ?? 1)} onChange={(e) => setSetting("redeem_step", e.target.value)} />
          </AdminInlineField>
          <AdminInlineField label={tText("单笔最多抵扣百分比")} hint={POINTS_REDEEM_FIELD_HINTS.max_redeem_percent}>
            <input className={adminFormInputCls} type="number" min={0} max={100} value={String(settings.max_redeem_percent ?? 30)} onChange={(e) => setSetting("max_redeem_percent", e.target.value)} />
          </AdminInlineField>
          <AdminInlineField label={tText("单笔最多抵扣金额")} hint={POINTS_REDEEM_FIELD_HINTS.max_redeem_amount}>
            <input className={adminFormInputCls} type="number" min={0} value={String(settings.max_redeem_amount ?? 0)} onChange={(e) => setSetting("max_redeem_amount", e.target.value)} />
          </AdminInlineField>
          <AdminInlineField label={tText("最低订单金额")} hint={POINTS_REDEEM_FIELD_HINTS.min_order_amount}>
            <input className={adminFormInputCls} type="number" min={0} value={String(settings.min_order_amount ?? 0)} onChange={(e) => setSetting("min_order_amount", e.target.value)} />
          </AdminInlineField>
          <AdminInlineField label={tText("抵扣范围")} hint={POINTS_REDEEM_FIELD_HINTS.redeem_scope}>
            <select className={adminFormInputCls} value={String(settings.redeem_scope || "exclude_restricted")} onChange={(e) => setSetting("redeem_scope", e.target.value)}>
              <option value="all"><Tx>全部商品</Tx></option>
              <option value="product_rule"><Tx>按商品/分类规则</Tx></option>
              <option value="exclude_restricted"><Tx>排除受监管商品</Tx></option>
            </select>
          </AdminInlineField>
        </fieldset>
      </AdminSettingsSection>
      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <button type="button" onClick={onSave} disabled={saving} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground">
          <Save className="h-4 w-4" />
          <Tx>保存抵扣设置</Tx>
        </button>
      </div>
    </div>
  );
}
