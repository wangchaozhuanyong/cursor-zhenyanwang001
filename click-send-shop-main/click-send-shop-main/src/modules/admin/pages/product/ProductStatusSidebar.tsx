import type { Dispatch, SetStateAction } from "react";
import AdminFieldHint, { AdminLabelWithHint } from "@/components/admin/AdminFieldHint";
import { Tx } from "@/components/admin/AdminText";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import { useAdminDisplayLabel } from "@/hooks/useAdminDisplayLabel";
import { LoadingButton } from "@/modules/micro-interactions";
import type { ProductFormPayloadSlice } from "@/modules/admin/pages/product/productFormTypes";
import {
  ADMIN_PRODUCT_FORM_COMPACT_CONTROL_CLASS,
  ADMIN_PRODUCT_FORM_MEDIUM_CONTROL_CLASS,
} from "@/modules/admin/pages/product/productFormPresentation";
import type { ProductTag } from "@/types/product";
import { COMPLIANCE_TYPE_LABELS } from "@/utils/adminDisplayLabels";
import { THEME_OUTLINE_DANGER } from "@/utils/themeVisuals";

type Props = {
  form: ProductFormPayloadSlice;
  setForm: Dispatch<SetStateAction<ProductFormPayloadSlice>>;
  allTags: ProductTag[];
  isNew: boolean;
  saving: boolean;
  deleting: boolean;
  uploadBusy: boolean;
  onSave: (publish?: boolean) => void | Promise<void>;
  onCancel: () => void;
  setDeleteConfirmOpen: Dispatch<SetStateAction<boolean>>;
  tText: (s: string) => string;
};

export default function ProductStatusSidebar({
  form,
  setForm,
  allTags,
  isNew,
  saving,
  deleting,
  uploadBusy,
  onSave,
  onCancel,
  setDeleteConfirmOpen,
  tText,
}: Props) {
  const { complianceType: labelComplianceType, text: L } = useAdminDisplayLabel();

  return (
    <div className="order-1 space-y-4 lg:order-none">
      <div className="sticky top-4 z-10 rounded-xl border border-border bg-card p-4 space-y-3 sm:p-6 lg:static lg:z-auto">
        <h3 className="text-sm font-semibold text-foreground"><Tx>状态设置</Tx></h3>
        <div className="rounded-lg border border-border p-3">
          <AdminLabelWithHint
            label={<Tx>销售状态</Tx>}
            hint={<Tx>草稿可用于先录入资料，确认后再上架。</Tx>}
          />
          <select
            value={form.status}
            onChange={(e) =>
              setForm({ ...form, status: e.target.value as "draft" | "active" | "inactive" })
            }
            className={ADMIN_PRODUCT_FORM_MEDIUM_CONTROL_CLASS}
          >
            <option value="draft"><Tx>草稿（前台不可见）</Tx></option>
            <option value="active"><Tx>上架</Tx></option>
            <option value="inactive"><Tx>下架</Tx></option>
          </select>
        </div>
        <div className="rounded-lg border border-border p-3 space-y-2">
          <p className="text-xs font-medium text-muted-foreground"><Tx>合规与收录</Tx></p>
          <label className="flex items-center justify-between">
            <span className="text-sm text-foreground"><Tx>是否受年龄限制</Tx></span>
            <input
              type="checkbox"
              className="accent-[var(--theme-primary)]"
              checked={form.is_age_restricted}
              onChange={(e) => {
                const checked = e.target.checked;
                setForm((prev) => ({
                  ...prev,
                  is_age_restricted: checked,
                  compliance_type: checked && prev.compliance_type === "normal" ? "age_restricted" : prev.compliance_type,
                  allow_index: checked ? false : prev.allow_index,
                }));
              }}
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-[10px] text-muted-foreground"><Tx>最低年龄</Tx></label>
              <input
                type="number"
                min={0}
                value={form.minimum_age}
                onChange={(e) => setForm((prev) => ({ ...prev, minimum_age: e.target.value }))}
                className={ADMIN_PRODUCT_FORM_COMPACT_CONTROL_CLASS}
                placeholder={tText("例如 18")}
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] text-muted-foreground"><Tx>合规类型</Tx></label>
              <select
                value={form.compliance_type}
                onChange={(e) => {
                  const value = e.target.value;
                  setForm((prev) => ({
                    ...prev,
                    compliance_type: value,
                    allow_index: value === "normal" && !prev.is_age_restricted ? prev.allow_index : false,
                  }));
                }}
                className={ADMIN_PRODUCT_FORM_COMPACT_CONTROL_CLASS}
              >
                {form.compliance_type && !COMPLIANCE_TYPE_LABELS[form.compliance_type] ? (
                  <option value={form.compliance_type}>{labelComplianceType(form.compliance_type)}</option>
                ) : null}
                {Object.entries(COMPLIANCE_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {L(label)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <input
            value={form.region_notice}
            onChange={(e) => setForm((prev) => ({ ...prev, region_notice: e.target.value }))}
            placeholder={tText("地区适用说明")}
            className={ADMIN_PRODUCT_FORM_COMPACT_CONTROL_CLASS}
          />
          <textarea
            rows={2}
            value={form.compliance_notice}
            onChange={(e) => setForm((prev) => ({ ...prev, compliance_notice: e.target.value }))}
            placeholder={tText("合规说明")}
            className={ADMIN_PRODUCT_FORM_COMPACT_CONTROL_CLASS}
          />
          <label className="flex items-center justify-between">
            <span className="text-sm text-foreground"><Tx>允许搜索引擎收录</Tx></span>
            <input
              type="checkbox"
              className="accent-[var(--theme-primary)]"
              checked={form.allow_index}
              onChange={(e) => setForm((prev) => ({ ...prev, allow_index: e.target.checked }))}
            />
          </label>
        </div>
        {(
          [
            { label: tText("热门"), desc: "显示热门标签", key: "is_hot" as const },
            { label: tText("是否标记为新品"), desc: "显示新品标签，并进入分类页「新品」入口", key: "is_new" as const },
            { label: tText("推荐"), desc: "首页推荐展示", key: "is_recommended" as const },
          ] as const
        ).map((t) => (
          <label key={t.key} className="flex items-center justify-between rounded-lg border border-border p-3">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-foreground">{t.label}</p>
              <AdminFieldHint text={t.desc} />
            </div>
            <input
              type="checkbox"
              className="accent-[var(--theme-primary)]"
              checked={form[t.key]}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, [t.key]: e.target.checked }));
              }}
            />
          </label>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="mb-3 text-sm font-semibold text-foreground"><Tx>预览</Tx></h3>
        <div className="rounded-lg border border-border p-3">
          {form.cover_image ? (
            <img src={form.cover_image} alt={form.cover_image_alt || `${form.name || "商品"} 卡片预览图`} className="mb-2 h-32 w-full rounded-md object-cover" />
          ) : (
            <div className="mb-2 h-32 rounded-md bg-secondary" />
          )}
          <div className="mb-1 flex flex-wrap gap-1">
            {form.tag_ids.length > 0 &&
              form.tag_ids.map((tid) => {
                const meta = allTags.find((x) => x.id === tid);
                if (!meta) return null;
                return (
                  <span
                    key={tid}
                    className="rounded-full border px-1.5 py-0.5 text-[10px] font-medium"
                    style={{
                      backgroundColor: meta.bg_color || "#FEF3C7",
                      color: meta.text_color || "#92400E",
                      borderColor: meta.bg_color || "#FEF3C7",
                    }}
                  >
                    {meta.name}
                  </span>
                );
              })}
          </div>
          <p className="text-sm font-medium text-foreground">{form.name || "商品名称"}</p>
          <p className="mt-1 text-sm font-bold text-theme-price">RM {form.price || "0.00"}</p>
        </div>
      </div>

      <div className="space-y-2">
        <LoadingButton
          type="button"
          variant="price"
          state={saving ? "loading" : "normal"}
          loadingText="保存中..."
          disabled={saving || deleting || uploadBusy}
          onClick={() => void onSave(false)}
          className="w-full rounded-lg px-6 py-3 text-sm font-semibold"
        ><Tx>
          保存
        </Tx></LoadingButton>
        <LoadingButton
          type="button"
          variant="outline"
          state={saving ? "loading" : "normal"}
          loadingText="保存中..."
          disabled={saving || deleting || uploadBusy}
          onClick={() => void onSave(true)}
          className="w-full rounded-lg border border-[var(--theme-price)] bg-[color-mix(in_srgb,var(--theme-price)_10%,var(--theme-surface))] px-6 py-3 text-sm font-semibold text-theme-price"
        ><Tx>
          保存并上架
        </Tx></LoadingButton>
        {!isNew && (
          <LoadingButton
            type="button"
            variant="outline"
            state={deleting ? "loading" : "normal"}
            loadingText="删除中..."
            disabled={deleting || saving || uploadBusy}
            onClick={() => setDeleteConfirmOpen(true)}
            className={`w-full rounded-lg border px-6 py-3 text-sm font-semibold ${THEME_OUTLINE_DANGER}`}
          ><Tx>
            删除商品
          </Tx></LoadingButton>
        )}
        <UnifiedButton onClick={onCancel} className="w-full rounded-lg border border-border px-6 py-3 text-sm text-muted-foreground"><Tx>取消</Tx></UnifiedButton>
      </div>
    </div>
  );
}
