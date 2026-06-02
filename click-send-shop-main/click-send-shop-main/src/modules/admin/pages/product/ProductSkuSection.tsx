import { Plus } from "lucide-react";
import type { ChangeEvent, Dispatch, SetStateAction } from "react";
import AdminFieldHint from "@/components/admin/AdminFieldHint";
import { Tx } from "@/components/admin/AdminText";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import type { AdminSpecGroup, ProductFormPayloadSlice } from "@/modules/admin/pages/product/productFormTypes";
import ProductSpecGroupsSection from "@/modules/admin/pages/product/ProductSpecGroupsSection";
import ProductVariantMatrixTable from "@/modules/admin/pages/product/ProductVariantMatrixTable";

type Props = {
  form: ProductFormPayloadSlice;
  setForm: Dispatch<SetStateAction<ProductFormPayloadSlice>>;
  isSingleDefaultSku: boolean;
  enabledStockTotal: number;
  showDefaultSkuAdvanced: boolean;
  setShowDefaultSkuAdvanced: Dispatch<SetStateAction<boolean>>;
  updateSpecGroups: (updater: (groups: AdminSpecGroup[]) => AdminSpecGroup[]) => void;
  convertToMatrixMode: () => void;
  tempId: () => string;
  uploadingVariantImageIndex: number | null;
  variantUploadProgress: number | null;
  onVariantImageUpload: (e: ChangeEvent<HTMLInputElement>, idx: number) => void | Promise<void>;
  tText: (s: string) => string;
};

export default function ProductSkuSection({
  form,
  setForm,
  isSingleDefaultSku,
  enabledStockTotal,
  showDefaultSkuAdvanced,
  setShowDefaultSkuAdvanced,
  updateSpecGroups,
  convertToMatrixMode,
  tempId,
  uploadingVariantImageIndex,
  variantUploadProgress,
  onVariantImageUpload,
  tText,
}: Props) {
  const hasMatrixSku = form.spec_groups.length > 0 || form.variants.length > 1;

  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">
          {isSingleDefaultSku ? <Tx>默认 SKU 设置</Tx> : <Tx>规格 / SKU</Tx>}
        </h3>
        {!isSingleDefaultSku ? (
          <UnifiedButton
            type="button"
            onClick={() =>
              setForm((f) => ({
                ...f,
                variants: [
                  ...f.variants,
                  {
                    title: "",
                    sku_code: "",
                    price: f.price || "0",
                    stock: f.stock || "0",
                    stock_warning_threshold: f.stock_warning_threshold || "5",
                    stock_lower_limit: f.stock_lower_limit || "",
                    stock_upper_limit: f.stock_upper_limit || "",
                    sort_order: f.variants.length,
                    is_default: false,
                  },
                ],
              }))
            }
            className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary"
          >
            <Plus size={14} /><Tx> 添加 SKU 行
            </Tx></UnifiedButton>
        ) : null}
      </div>
      <div className="flex justify-end">
        <AdminFieldHint
          text={<Tx>可在此维护各规格库存与价格；保存后同步到商品总库存。</Tx>}
        />
      </div>
      {isSingleDefaultSku ? (
        <div className="rounded-lg border border-gold/30 bg-gold/5 p-3 text-xs leading-5 text-muted-foreground">
          <p className="font-medium text-foreground"><Tx>当前商品未启用多规格，系统将使用“默认规格 / 默认 SKU”管理库存、成本、条码和预警。</Tx></p>
          <p className="mt-1"><Tx>如果商品有颜色、尺码、口味等差异，可以转为矩阵规格，为每个规格组合单独维护 SKU。</Tx></p>
          <UnifiedButton
            type="button"
            onClick={() => setShowDefaultSkuAdvanced((v) => !v)}
            className="mt-3 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground"
          >
            {showDefaultSkuAdvanced ? tText("收起默认 SKU 高级设置") : tText("展开默认 SKU 高级设置")}
          </UnifiedButton>
        </div>
      ) : null}
      {hasMatrixSku ? (
        <div className="rounded-lg border border-border bg-secondary/40 p-3 text-xs leading-5 text-muted-foreground">
          <p className="font-medium text-foreground"><Tx>多规格商品以 SKU 表格维护售价、划线原价与库存。</Tx></p>
          <p className="mt-1 text-muted-foreground">
            <Tx>基本信息只显示默认 SKU 快照和商品总库存；修改默认 SKU 后会同步到这里。</Tx>
          </p>
          <p className="mt-1">
            {tText("默认展示售价")}：RM {form.price || "0"}；{" "}
            {tText("划线原价")}：{form.original_price ? `RM ${form.original_price}` : "-"}；{" "}
            {tText("商品总库存")}：{enabledStockTotal}
          </p>
        </div>
      ) : null}
      <ProductSpecGroupsSection
        specGroups={form.spec_groups}
        updateSpecGroups={updateSpecGroups}
        convertToMatrixMode={convertToMatrixMode}
        tempId={tempId}
        tText={tText}
      />
      {hasMatrixSku || showDefaultSkuAdvanced ? (
        <ProductVariantMatrixTable
          form={form}
          setForm={setForm}
          uploadingVariantImageIndex={uploadingVariantImageIndex}
          variantUploadProgress={variantUploadProgress}
          onVariantImageUpload={onVariantImageUpload}
          tText={tText}
        />
      ) : null}
    </div>
  );
}
