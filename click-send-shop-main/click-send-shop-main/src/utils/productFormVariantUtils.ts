/** 商品表单：规格笛卡尔积与 SKU 矩阵工具 */

export type SpecValueLike = {
  id?: string;
  value: string;
  image_url?: string;
  sort_order: number;
};

export type SpecGroupLike = {
  id?: string;
  name: string;
  sort_order: number;
  values: SpecValueLike[];
};

export const MAX_SPEC_GROUPS = 3;
export const MAX_SPEC_VALUES_PER_GROUP = 20;
export const MAX_SKU_MATRIX_SIZE = 200;
export const DEFAULT_VARIANT_TITLE = "默认规格";

export const tempVariantId = () => `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export function cartesianSpecValues(groups: SpecGroupLike[]) {
  const usable = groups
    .map((group) => ({
      ...group,
      values: group.values.filter((value) => value.value.trim()),
    }))
    .filter((group) => group.name.trim() && group.values.length > 0);
  if (!usable.length) return [];
  return usable.reduce<Array<Array<{ group: SpecGroupLike; value: SpecValueLike }>>>((acc, group) => {
    const entries = group.values.map((value) => ({ group, value }));
    if (!acc.length) return entries.map((entry) => [entry]);
    return acc.flatMap((combo) => entries.map((entry) => [...combo, entry]));
  }, []);
}

export function specComboKey(ids: string[]) {
  return ids.filter(Boolean).join("|");
}
