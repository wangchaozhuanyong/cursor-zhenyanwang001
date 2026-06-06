import { Trash2 } from "lucide-react";
import AdminFieldHint from "@/components/admin/AdminFieldHint";
import { Tx } from "@/components/admin/AdminText";
import type { AdminSpecGroup } from "@/modules/admin/pages/product/productFormTypes";
import { THEME_TEXT_DANGER } from "@/utils/themeVisuals";
import { MAX_SPEC_GROUPS, MAX_SPEC_VALUES_PER_GROUP } from "@/utils/productFormVariantUtils";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

type Props = {
  specGroups: AdminSpecGroup[];
  updateSpecGroups: (updater: (groups: AdminSpecGroup[]) => AdminSpecGroup[]) => void;
  convertToMatrixMode: () => void;
  tempId: () => string;
  tText: (zh: string) => string;
};

export default function ProductSpecGroupsSection({
  specGroups,
  updateSpecGroups,
  convertToMatrixMode,
  tempId,
  tText,
}: Props) {
  return (
    <div className="space-y-3 rounded-lg border border-border bg-background/40 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5">
            <p className="text-xs font-semibold text-foreground">
              <Tx>规格设置</Tx>
            </p>
            <AdminFieldHint
              text={`最多 ${MAX_SPEC_GROUPS} 个规格组，每组最多 ${MAX_SPEC_VALUES_PER_GROUP} 个规格值。规格值会生成 SKU 组合。`}
            />
          </div>
        </div>
        <div className="flex gap-2">
          {specGroups.length === 0 ? (
            <UnifiedButton
              type="button"
              onClick={convertToMatrixMode}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-secondary"
            >
              启用多规格
            </UnifiedButton>
          ) : null}
          <UnifiedButton
            type="button"
            disabled={specGroups.length >= MAX_SPEC_GROUPS}
            onClick={() =>
              updateSpecGroups((groups) => [
                ...groups,
                { id: tempId(), name: `规格${groups.length + 1}`, sort_order: groups.length, values: [] },
              ])
            }
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-secondary disabled:opacity-40"
          >
            添加规格组
          </UnifiedButton>
        </div>
      </div>
      {specGroups.map((group, groupIdx) => (
        <div key={group.id || groupIdx} className="rounded-lg border border-border p-3">
          <div className="flex gap-2">
            <input
              value={group.name}
              onChange={(e) => {
                const value = e.target.value;
                updateSpecGroups((groups) =>
                  groups.map((g, i) => (i === groupIdx ? { ...g, name: value } : g)),
                );
              }}
              placeholder={tText("如：颜色")}
              className="min-w-0 flex-1 rounded-md bg-secondary px-2 py-1.5 text-xs outline-none"
            />
            <UnifiedButton
              type="button"
              onClick={() => updateSpecGroups((groups) => groups.filter((_, i) => i !== groupIdx))}
              className={THEME_TEXT_DANGER}
              title={tText("删除规格组")}
            >
              <Trash2 size={14} />
            </UnifiedButton>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {group.values.map((value, valueIdx) => (
              <div
                key={value.id || valueIdx}
                className="flex items-center gap-1 rounded-full border border-border bg-secondary px-2 py-1"
              >
                <input
                  value={value.value}
                  onChange={(e) => {
                    const text = e.target.value;
                    updateSpecGroups((groups) =>
                      groups.map((g, gi) =>
                        gi === groupIdx
                          ? {
                              ...g,
                              values: g.values.map((v, vi) =>
                                vi === valueIdx ? { ...v, value: text } : v,
                              ),
                            }
                          : g,
                      ),
                    );
                  }}
                  placeholder={tText("规格值")}
                  className="w-20 bg-transparent text-xs outline-none"
                />
                <UnifiedButton
                  type="button"
                  onClick={() =>
                    updateSpecGroups((groups) =>
                      groups.map((g, gi) =>
                        gi === groupIdx
                          ? { ...g, values: g.values.filter((_, vi) => vi !== valueIdx) }
                          : g,
                      ),
                    )
                  }
                  className={THEME_TEXT_DANGER}
                  title={tText("删除规格值")}
                >
                  ×
                </UnifiedButton>
              </div>
            ))}
            <UnifiedButton
              type="button"
              disabled={group.values.length >= MAX_SPEC_VALUES_PER_GROUP}
              onClick={() =>
                updateSpecGroups((groups) =>
                  groups.map((g, gi) =>
                    gi === groupIdx
                      ? {
                          ...g,
                          values: [
                            ...g.values,
                            { id: tempId(), value: "", image_url: "", sort_order: g.values.length },
                          ],
                        }
                      : g,
                  ),
                )
              }
              className="rounded-full border border-dashed border-border px-3 py-1 text-xs text-muted-foreground hover:border-[color-mix(in_srgb,var(--theme-primary)_50%,var(--theme-border))] disabled:opacity-40"
            >
              + 规格值
            </UnifiedButton>
          </div>
        </div>
      ))}
    </div>
  );
}
