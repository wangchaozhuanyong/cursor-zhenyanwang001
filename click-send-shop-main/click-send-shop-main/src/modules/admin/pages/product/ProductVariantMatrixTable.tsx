import { Loader2, Trash2, Upload } from "lucide-react";
import type { ChangeEvent, Dispatch, SetStateAction } from "react";
import AdminNativeTable from "@/components/admin/AdminNativeTable";
import { Tx } from "@/components/admin/AdminText";
import { THEME_HOVER_TEXT_DANGER, THEME_TEXT_DANGER } from "@/utils/themeVisuals";
import { adminThClassName } from "@/utils/adminTableClasses";
import { DEFAULT_VARIANT_TITLE } from "@/utils/productFormVariantUtils";
import type { ProductVariantMatrixFormSlice } from "@/modules/admin/pages/product/productFormTypes";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import {
  removeProductVariantRow,
  selectProductDefaultVariant,
  updateProductVariantField,
} from "@/modules/admin/pages/product/productFormState";

type Props<T extends ProductVariantMatrixFormSlice> = {
  form: T;
  setForm: Dispatch<SetStateAction<T>>;
  uploadingVariantImageIndex: number | null;
  variantUploadProgress: number | null;
  onVariantImageUpload: (e: ChangeEvent<HTMLInputElement>, idx: number) => void | Promise<void>;
  tText: (s: string) => string;
};

export default function ProductVariantMatrixTable<T extends ProductVariantMatrixFormSlice>({
  form,
  setForm,
  uploadingVariantImageIndex,
  variantUploadProgress,
  onVariantImageUpload,
  tText,
}: Props<T>) {
  return (
    <AdminNativeTable tableClassName="min-w-[520px] text-xs">
      <thead>
        <tr className="border-b border-border text-left text-muted-foreground">
          <th className={adminThClassName("w-10", "center")}>
            <Tx>默认</Tx>
          </th>
          <th className={adminThClassName(undefined, "left")}>
            <Tx>规格名</Tx>
          </th>
          <th className={adminThClassName(undefined, "left")}>SKU</th>
          <th className={adminThClassName(undefined, "right")}>
            <Tx>库存下限</Tx>
          </th>
          <th className={adminThClassName(undefined, "right")}>
            <Tx>库存上限</Tx>
          </th>
          <th className={adminThClassName(undefined, "right")}>
            <Tx>价格</Tx>
          </th>
          <th className={adminThClassName(undefined, "right")}>
            <Tx>原价</Tx>
          </th>
          <th className={adminThClassName(undefined, "right")}>
            <Tx>成本</Tx>
          </th>
          <th className={adminThClassName(undefined, "right")}>
            <Tx>库存</Tx>
          </th>
          <th className={adminThClassName(undefined, "right")}>
            <Tx>预警</Tx>
          </th>
          <th className={adminThClassName(undefined, "left")}>
            <Tx>条码</Tx>
          </th>
          <th className={adminThClassName(undefined, "center")}>
            <Tx>图片</Tx>
          </th>
          <th className={adminThClassName(undefined, "center")}>
            <Tx>启用</Tx>
          </th>
          <th className={adminThClassName("w-10", "right")} />
        </tr>
      </thead>
      <tbody>
        {form.variants.map((v, idx) => (
          <tr key={`${v.id || "n"}-${idx}`} className="border-b border-border/60">
            <td className="py-2 pr-2 align-middle">
              <input
                type="radio"
                name="default-variant"
                checked={v.is_default}
                onChange={() => setForm((f) => selectProductDefaultVariant(f, idx))}
                className="accent-gold"
              />
            </td>
            <td className="py-2 pr-2">
              <input
                value={v.title}
                onChange={(e) => {
                  const t = e.target.value;
                  setForm((f) =>
                    updateProductVariantField(
                      f,
                      idx,
                      "title",
                      t || (f.variants[idx]?.is_default && f.spec_groups.length === 0 ? DEFAULT_VARIANT_TITLE : ""),
                    ),
                  );
                }}
                placeholder={
                  v.is_default && form.spec_groups.length === 0
                    ? DEFAULT_VARIANT_TITLE
                    : tText("如：标准款")
                }
                className="w-full min-w-[96px] rounded-md bg-secondary px-2 py-1.5 text-foreground outline-none"
              />
            </td>
            <td className="py-2 pr-2">
              <input
                value={v.sku_code}
                onChange={(e) => setForm((f) => updateProductVariantField(f, idx, "sku_code", e.target.value))}
                placeholder={tText("可选")}
                className="w-full min-w-[80px] rounded-md bg-secondary px-2 py-1.5 text-foreground outline-none"
              />
            </td>
            <td className="py-2 pr-2">
              <input
                type="number"
                min={0}
                value={v.is_default ? form.stock_lower_limit : v.stock_lower_limit || ""}
                onChange={(e) => setForm((f) => updateProductVariantField(f, idx, "stock_lower_limit", e.target.value))}
                className="w-full min-w-[64px] rounded-md bg-secondary px-2 py-1.5 text-foreground outline-none"
              />
            </td>
            <td className="py-2 pr-2">
              <input
                type="number"
                min={0}
                value={v.is_default ? form.stock_upper_limit : v.stock_upper_limit || ""}
                onChange={(e) => setForm((f) => updateProductVariantField(f, idx, "stock_upper_limit", e.target.value))}
                className="w-full min-w-[64px] rounded-md bg-secondary px-2 py-1.5 text-foreground outline-none"
              />
            </td>
            <td className="py-2 pr-2">
              <input
                type="number"
                value={v.is_default ? form.price : v.price}
                onChange={(e) => setForm((f) => updateProductVariantField(f, idx, "price", e.target.value))}
                className="w-full min-w-[72px] rounded-md bg-secondary px-2 py-1.5 text-foreground outline-none"
              />
            </td>
            <td className="py-2 pr-2">
              <input
                type="number"
                min={0}
                value={v.is_default ? form.original_price : v.original_price || ""}
                placeholder={tText("可选")}
                onChange={(e) => setForm((f) => updateProductVariantField(f, idx, "original_price", e.target.value))}
                className="w-full min-w-[72px] rounded-md bg-secondary px-2 py-1.5 text-foreground outline-none"
              />
            </td>
            <td className="py-2 pr-2">
              <input
                type="number"
                value={v.cost_price || ""}
                onChange={(e) => setForm((f) => updateProductVariantField(f, idx, "cost_price", e.target.value))}
                className="w-full min-w-[72px] rounded-md bg-secondary px-2 py-1.5 text-foreground outline-none"
              />
            </td>
            <td className="py-2 pr-2">
              <input
                type="number"
                min={0}
                value={v.is_default ? form.stock : v.stock}
                onChange={(e) => setForm((f) => updateProductVariantField(f, idx, "stock", e.target.value))}
                className="w-full min-w-[64px] rounded-md bg-secondary px-2 py-1.5 text-foreground outline-none"
              />
            </td>
            <td className="py-2 pr-2">
              <input
                type="number"
                min={0}
                value={v.stock_warning_threshold || ""}
                onChange={(e) => setForm((f) => updateProductVariantField(f, idx, "stock_warning_threshold", e.target.value))}
                className="w-full min-w-[64px] rounded-md bg-secondary px-2 py-1.5 text-foreground outline-none"
              />
            </td>
            <td className="py-2 pr-2">
              <input
                value={v.barcode || ""}
                onChange={(e) => setForm((f) => updateProductVariantField(f, idx, "barcode", e.target.value))}
                className="w-full min-w-[96px] rounded-md bg-secondary px-2 py-1.5 text-foreground outline-none"
              />
            </td>
            <td className="py-2 pr-2">
              <div className="min-w-[180px] space-y-1">
                <div className="flex items-center gap-2">
                  {v.image_url ? (
                    <img
                      src={v.image_url}
                      alt={`${v.title || "SKU"} 图片`}
                      className="h-8 w-8 rounded border border-border object-cover"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded border border-dashed border-border bg-secondary" />
                  )}
                  <label
                    className={`inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] ${uploadingVariantImageIndex === idx ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-secondary"}`}
                  >
                    {uploadingVariantImageIndex === idx ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Upload size={12} />
                    )}
                    {uploadingVariantImageIndex === idx ? "上传中" : "上传"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploadingVariantImageIndex !== null}
                      onChange={(e) => void onVariantImageUpload(e, idx)}
                    />
                  </label>
                  {!!v.image_url && (
                    <UnifiedButton
                      type="button"
                      onClick={() => setForm((f) => updateProductVariantField(f, idx, "image_url", ""))}
                      className={`text-[11px] ${THEME_HOVER_TEXT_DANGER}`}
                    >
                      清除
                    </UnifiedButton>
                  )}
                </div>
                {uploadingVariantImageIndex === idx && variantUploadProgress !== null ? (
                  <p className="text-[10px] text-muted-foreground">
                    上传进度 {variantUploadProgress}%
                  </p>
                ) : null}
                <input
                  value={v.image_url || ""}
                  onChange={(e) => setForm((f) => updateProductVariantField(f, idx, "image_url", e.target.value))}
                  placeholder="URL"
                  className="w-full rounded-md bg-secondary px-2 py-1.5 text-foreground outline-none"
                />
              </div>
            </td>
            <td className="py-2 pr-2 text-center">
              <input
                type="checkbox"
                checked={v.enabled !== false}
                onChange={(e) => setForm((f) => updateProductVariantField(f, idx, "enabled", e.target.checked))}
                className="accent-gold"
              />
            </td>
            <td className="py-2 align-middle">
              <UnifiedButton
                type="button"
                disabled={form.variants.length <= 1}
                onClick={() => setForm((f) => removeProductVariantRow(f, idx))}
                className={`${THEME_TEXT_DANGER} disabled:opacity-30`}
                title={tText("删除此行")}
              >
                <Trash2 size={14} />
              </UnifiedButton>
            </td>
          </tr>
        ))}
      </tbody>
    </AdminNativeTable>
  );
}
