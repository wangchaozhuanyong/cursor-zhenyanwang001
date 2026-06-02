import type { Dispatch, SetStateAction } from "react";
import AdminFieldHint from "@/components/admin/AdminFieldHint";
import { Tx } from "@/components/admin/AdminText";
import type { FlatCategory } from "@/utils/categoryTree";
import type { ProductFormPayloadSlice } from "@/modules/admin/pages/product/productFormTypes";
import { ADMIN_PRODUCT_FORM_CONTROL_CLASS } from "@/modules/admin/pages/product/productFormPresentation";
import {
  updateProductDefaultVariantField,
  type DefaultVariantSyncedField,
} from "@/modules/admin/pages/product/productFormState";

type Props = {
  form: ProductFormPayloadSlice;
  setForm: Dispatch<SetStateAction<ProductFormPayloadSlice>>;
  categoryOptions: FlatCategory[];
  isSingleDefaultSku: boolean;
  enabledStockTotal: number;
  tText: (s: string) => string;
};

export default function ProductBasicInfoSection({
  form,
  setForm,
  categoryOptions,
  isSingleDefaultSku,
  enabledStockTotal,
  tText,
}: Props) {
  const updateDefaultVariantField = (field: DefaultVariantSyncedField, value: string) => {
    setForm((f) => updateProductDefaultVariantField(f, field, value));
  };

  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-4">
      <h3 className="text-sm font-semibold text-foreground"><Tx>基本信息</Tx></h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-muted-foreground"><Tx>商品名称</Tx></label>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder={tText("输入商品名称")}
            className={ADMIN_PRODUCT_FORM_CONTROL_CLASS}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            <Tx>库存预警阈值（可选）</Tx>
          </label>
          <input
            type="number"
            min={0}
            value={form.stock_warning_threshold}
            onChange={(e) => updateDefaultVariantField("stock_warning_threshold", e.target.value)}
            placeholder="5"
            className={ADMIN_PRODUCT_FORM_CONTROL_CLASS}
          />
          <div className="mt-1 flex justify-end">
            <AdminFieldHint text={<Tx>库存低于或等于此值时会提示有可能补货。空值时默认按 5。</Tx>} />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground"><Tx>默认展示售价 (RM)</Tx></label>
          <input
            value={form.price}
            onChange={(e) => updateDefaultVariantField("price", e.target.value)}
            placeholder="0.00"
            className={ADMIN_PRODUCT_FORM_CONTROL_CLASS}
          />
          <div className="mt-1 flex justify-end">
            <AdminFieldHint text={<Tx>保存时与默认 SKU 售价保持一致；多规格商品以前台默认 SKU 作为展示价。</Tx>} />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground"><Tx>划线原价 (RM)</Tx></label>
          <input
            value={form.original_price}
            onChange={(e) => updateDefaultVariantField("original_price", e.target.value)}
            placeholder={tText("留空则不展示")}
            className={ADMIN_PRODUCT_FORM_CONTROL_CLASS}
          />
          <div className="mt-1 flex justify-end">
            <AdminFieldHint
              text={
                <Tx>
                  与下方 SKU「划线原价」为同一字段（默认 SKU 双向同步）。须大于售价时，前台才显示删除线；不是成本价。
                </Tx>
              }
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground"><Tx>默认 SKU 初始库存</Tx></label>
          <input
            type="number"
            min={0}
            value={isSingleDefaultSku ? form.stock : String(enabledStockTotal)}
            onChange={(e) => updateDefaultVariantField("stock", e.target.value)}
            disabled={!isSingleDefaultSku}
            placeholder="0"
            className={ADMIN_PRODUCT_FORM_CONTROL_CLASS}
          />
          <div className="mt-1 flex justify-end">
            <AdminFieldHint text={<Tx>保存时写入默认 SKU；大批量入库仍建议在库存中心操作。</Tx>} />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground"><Tx>成本价 (RM)</Tx></label>
          <input
            value={form.cost_price}
            onChange={(e) => updateDefaultVariantField("cost_price", e.target.value)}
            placeholder="0.00"
            className={ADMIN_PRODUCT_FORM_CONTROL_CLASS}
          />
          <div className="mt-1 flex justify-end">
            <AdminFieldHint text={<Tx>成本价只用于后台毛利核算，保存时同步默认 SKU。</Tx>} />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground"><Tx>库存下限</Tx></label>
          <input
            type="number"
            min={0}
            value={form.stock_lower_limit}
            onChange={(e) => updateDefaultVariantField("stock_lower_limit", e.target.value)}
            placeholder="0"
            className={ADMIN_PRODUCT_FORM_CONTROL_CLASS}
          />
          <div className="mt-1 flex justify-end">
            <AdminFieldHint text={<Tx>下限用于触发补货提醒，保存时同步默认 SKU。</Tx>} />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground"><Tx>库存上限</Tx></label>
          <input
            type="number"
            min={0}
            value={form.stock_upper_limit}
            onChange={(e) => updateDefaultVariantField("stock_upper_limit", e.target.value)}
            placeholder="0"
            className={ADMIN_PRODUCT_FORM_CONTROL_CLASS}
          />
          <div className="mt-1 flex justify-end">
            <AdminFieldHint text={<Tx>上限是建议补到的目标库存，保存时同步默认 SKU。</Tx>} />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground"><Tx>销量</Tx></label>
          <input
            type="number"
            value={form.sales_count}
            onChange={(e) => setForm({ ...form, sales_count: e.target.value })}
            placeholder="0"
            className={ADMIN_PRODUCT_FORM_CONTROL_CLASS}
          />
          <div className="mt-1 flex justify-end">
            <AdminFieldHint text={<Tx>订单付款后由系统自动累加；可手动修正起步销量。</Tx>} />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground"><Tx>分类</Tx></label>
          <select
            value={form.category_id}
            onChange={(e) => setForm({ ...form, category_id: e.target.value })}
            className={ADMIN_PRODUCT_FORM_CONTROL_CLASS}
          >
            <option value=""><Tx>选择分类</Tx></option>
            {categoryOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {"　".repeat(c.level)}
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground"><Tx>排序</Tx></label>
          <input
            type="number"
            value={form.sort_order}
            onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
            placeholder="0"
            className={ADMIN_PRODUCT_FORM_CONTROL_CLASS}
          />
        </div>
      </div>
    </div>
  );
}
