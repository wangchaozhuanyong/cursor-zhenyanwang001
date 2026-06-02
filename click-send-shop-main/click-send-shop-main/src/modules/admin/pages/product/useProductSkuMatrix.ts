import { useCallback, type Dispatch, type SetStateAction } from "react";
import { toast } from "sonner";
import type { AdminSpecGroup, ProductFormPayloadSlice } from "@/modules/admin/pages/product/productFormTypes";
import {
  buildMatrixModeProductForm,
  buildRegeneratedProductSkuMatrix,
} from "@/modules/admin/pages/product/productSkuMatrix";
import { tempVariantId } from "@/utils/productFormVariantUtils";

type UseProductSkuMatrixOptions = {
  setForm: Dispatch<SetStateAction<ProductFormPayloadSlice>>;
};

export function useProductSkuMatrix({ setForm }: UseProductSkuMatrixOptions) {
  const regenerateSkuMatrix = useCallback(
    (nextGroups: AdminSpecGroup[]) => {
      setForm((form) => {
        const result = buildRegeneratedProductSkuMatrix(form, nextGroups);
        if (result.status === "tooLarge") {
          toast.error(`SKU 组合不能超过 ${result.maxSize} 个`);
          return form;
        }
        return result.form;
      });
    },
    [setForm],
  );

  const updateSpecGroups = useCallback(
    (updater: (groups: AdminSpecGroup[]) => AdminSpecGroup[]) => {
      setForm((form) => {
        const nextGroups = updater(form.spec_groups);
        window.setTimeout(() => regenerateSkuMatrix(nextGroups), 0);
        return { ...form, spec_groups: nextGroups };
      });
    },
    [regenerateSkuMatrix, setForm],
  );

  const convertToMatrixMode = useCallback(() => {
    setForm((form) => buildMatrixModeProductForm(form, tempVariantId));
  }, [setForm]);

  return {
    updateSpecGroups,
    convertToMatrixMode,
  };
}
