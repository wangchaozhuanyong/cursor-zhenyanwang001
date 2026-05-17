import { Copy, Maximize2, Plus, Sparkles, Star, Trash2 } from "lucide-react";
import { LoadingButton } from "@/modules/micro-interactions";
import PermissionGate from "@/components/admin/PermissionGate";
import StoreBadge from "@/components/ui/StoreBadge";
import { Tx } from "@/components/admin/AdminText";
import { THEME_BADGE_WARNING, THEME_OUTLINE_DANGER } from "@/utils/themeVisuals";

export type ThemeStudioHeaderProps = {
  skinName: string;
  isDefault: boolean;
  dirty: boolean;
  saving: boolean;
  saveDisabled?: boolean;
  onSaveDraft: () => void;
  onSaveAndApply: () => void;
  onCopy: () => void;
  onAdd: () => void;
  starterQuickAdds?: Array<{ id: string; label: string }>;
  onAddStarter?: (starterId: string) => void;
  onSetDefault: () => void;
  canDelete?: boolean;
  onDelete: () => void;
  onFullscreen: () => void;
};

export default function ThemeStudioHeader({
  skinName,
  isDefault,
  dirty,
  saving,
  saveDisabled,
  onSaveDraft,
  onSaveAndApply,
  onCopy,
  onAdd,
  starterQuickAdds,
  onAddStarter,
  onSetDefault,
  canDelete = true,
  onDelete,
  onFullscreen,
}: ThemeStudioHeaderProps) {
  return (
    <header className="sticky top-0 z-20 -mx-3 mb-4 rounded-xl border border-border bg-[var(--theme-card)]/95 px-3 py-3 shadow-sm backdrop-blur-md sm:-mx-0 sm:px-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-lg font-bold text-foreground"><Tx>Theme Studio 皮肤设计工作台</Tx></h1>
            {isDefault ? <StoreBadge type="success"><Tx>默认皮肤</Tx></StoreBadge> : null}
            {dirty ? (
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${THEME_BADGE_WARNING}`}><Tx>
                有未保存更改
              </Tx></span>
            ) : (
              <span className="text-[11px] text-muted-foreground"><Tx>已与服务器同步</Tx></span>
            )}
          </div>
          <p className="mt-1 truncate text-sm text-muted-foreground"><Tx>
            正在编辑：</Tx><span className="font-medium text-foreground">{skinName || "未命名皮肤"}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onFullscreen}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-secondary"
          >
            <Maximize2 size={14} /><Tx>
            全屏预览
          </Tx></button>
          <button type="button" onClick={onAdd} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-secondary">
            <Plus size={14} /><Tx>
            新建
          </Tx></button>
          {onAddStarter && starterQuickAdds?.length
            ? starterQuickAdds.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onAddStarter(item.id)}
                  className="inline-flex items-center gap-1 rounded-lg border border-[var(--theme-primary)]/35 bg-[color-mix(in_srgb,var(--theme-primary)_8%,transparent)] px-3 py-1.5 text-xs font-medium text-[var(--theme-primary)] hover:bg-[color-mix(in_srgb,var(--theme-primary)_14%,transparent)]"
                >
                  <Sparkles size={14} />
                  <Tx>添加</Tx>「{item.label}」
                </button>
              ))
            : null}
          <button type="button" onClick={onCopy} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-secondary">
            <Copy size={14} /><Tx>
            复制
          </Tx></button>
          {!isDefault ? (
            <button type="button" onClick={onSetDefault} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-secondary">
              <Star size={14} /><Tx>
              设为默认
            </Tx></button>
          ) : null}
          {canDelete ? (
            <button type="button" onClick={onDelete} className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs ${THEME_OUTLINE_DANGER}`}>
              <Trash2 size={14} /><Tx>
              删除
            </Tx></button>
          ) : (
            <span className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground" title="默认皮肤不可删除"><Tx>
              默认皮肤
            </Tx></span>
          )}
          <PermissionGate permission="settings.manage">
            <LoadingButton
              type="button"
              variant="outline"
              state={saving ? "loading" : "normal"}
              loadingText="保存中..."
              disabled={saveDisabled}
              onClick={onSaveDraft}
              className="inline-flex rounded-lg border border-border px-3 py-2 text-xs font-semibold"
            ><Tx>
              保存草稿
            </Tx></LoadingButton>
            <LoadingButton
              type="button"
              variant="solid"
              state={saving ? "loading" : "normal"}
              loadingText="应用中..."
              disabled={saveDisabled}
              onClick={onSaveAndApply}
              className="inline-flex rounded-lg bg-[var(--theme-primary)] px-4 py-2 text-sm font-semibold text-[var(--theme-primary-foreground)]"
            ><Tx>
              保存并应用到全站
            </Tx></LoadingButton>
          </PermissionGate>
        </div>
      </div>
    </header>
  );
}
