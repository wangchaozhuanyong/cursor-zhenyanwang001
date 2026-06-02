import type { Dispatch, SetStateAction } from "react";
import { Save } from "lucide-react";
import { Tx } from "@/components/admin/AdminText";
import { AdminSectionTitle } from "@/components/admin/AdminFieldHint";
import { adminFormInputCls, AdminInlineField } from "@/components/admin/forms/AdminFormFields";
import { POINTS_ADJUST_FIELD_HINTS, POINTS_TAB_HINTS } from "@/modules/admin/pages/marketing/adminPointsHints";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

type Props = {
  adjustForm: { userId: string; points: string; reason: string };
  setAdjustForm: Dispatch<SetStateAction<{ userId: string; points: string; reason: string }>>;
  onSubmit: () => void;
  submitting: boolean;
  tText: (zh: string) => string;
};

export default function PointsManualAdjustTab({ adjustForm, setAdjustForm, onSubmit, submitting, tText }: Props) {
  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-5">
      <AdminSectionTitle title={<Tx>手动调整用户积分</Tx>} hint={POINTS_TAB_HINTS["手动调整"]} />
      <div className="grid gap-3 lg:grid-cols-2">
        <AdminInlineField label={tText("用户编号（从详情复制）")} hint={POINTS_ADJUST_FIELD_HINTS.userId}>
          <input className={adminFormInputCls} value={adjustForm.userId} onChange={(e) => setAdjustForm((s) => ({ ...s, userId: e.target.value }))} />
        </AdminInlineField>
        <AdminInlineField label={tText("调整积分")} hint={POINTS_ADJUST_FIELD_HINTS.points}>
          <input className={adminFormInputCls} type="number" value={adjustForm.points} onChange={(e) => setAdjustForm((s) => ({ ...s, points: e.target.value }))} />
        </AdminInlineField>
        <AdminInlineField label={tText("原因")} hint={POINTS_ADJUST_FIELD_HINTS.reason} className="lg:col-span-2">
          <input className={adminFormInputCls} value={adjustForm.reason} onChange={(e) => setAdjustForm((s) => ({ ...s, reason: e.target.value }))} />
        </AdminInlineField>
      </div>
      <UnifiedButton type="button" onClick={onSubmit} disabled={submitting} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground">
        <Save className="h-4 w-4" />
        <Tx>提交调整</Tx>
      </UnifiedButton>
    </div>
  );
}
