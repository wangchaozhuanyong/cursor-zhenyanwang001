import { Copy, Maximize2, Plus, Star, Trash2 } from "lucide-react";
import { LoadingButton } from "@/modules/micro-interactions";
import PermissionGate from "@/components/admin/PermissionGate";
import StoreBadge from "@/components/ui/StoreBadge";

export type ThemeStudioHeaderProps = {
  skinName: string;
  isDefault: boolean;
  dirty: boolean;
  saving: boolean;
  saveDisabled?: boolean;
  onSave: () => void;
  onCopy: () => void;
  onAdd: () => void;
  onSetDefault: () => void;
  canDelete?: boolean;
  onDelete: () => void;
  onFullscreen: () => void;
  onApplyAdmin?: () => void;
};

export default function ThemeStudioHeader({
  skinName,
  isDefault,
  dirty,
  saving,
  saveDisabled,
  onSave,
  onCopy,
  onAdd,
  onSetDefault,
  canDelete = true,
  onDelete,
  onFullscreen,
  onApplyAdmin,
}: ThemeStudioHeaderProps) {
  return (
    <header className="sticky top-0 z-20 -mx-3 mb-4 rounded-xl border border-border bg-[var(--theme-card)]/95 px-3 py-3 shadow-sm backdrop-blur-md sm:-mx-0 sm:px-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-lg font-bold text-foreground">Theme Studio 皮肤设计工作台</h1>
            {isDefault ? <StoreBadge type="success">默认皮肤</StoreBadge> : null}
            {dirty ? (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                有未保存更改
              </span>
            ) : (
              <span className="text-[11px] text-muted-foreground">已与服务器同步</span>
            )}
          </div>
          <p className="mt-1 truncate text-sm text-muted-foreground">
            正在编辑：<span className="font-medium text-foreground">{skinName || "未命名皮肤"}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onFullscreen}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-secondary"
          >
            <Maximize2 size={14} />
            全屏预览
          </button>
          {onApplyAdmin ? (
            <button
              type="button"
              onClick={onApplyAdmin}
              className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-secondary"
            >
              应用到当前后台
            </button>
          ) : null}
          <button type="button" onClick={onAdd} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-secondary">
            <Plus size={14} />
            新建
          </button>
          <button type="button" onClick={onCopy} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-secondary">
            <Copy size={14} />
            复制
          </button>
          {!isDefault ? (
            <button type="button" onClick={onSetDefault} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-secondary">
              <Star size={14} />
              设为默认
            </button>
          ) : null}
          {canDelete ? (
            <button type="button" onClick={onDelete} className="inline-flex items-center gap-1 rounded-lg border border-destructive/40 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10">
              <Trash2 size={14} />
              删除
            </button>
          ) : (
            <span className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground" title="默认皮肤不可删除">
              默认皮肤
            </span>
          )}
          <PermissionGate permission="settings.manage">
            <LoadingButton
              type="button"
              variant="solid"
              state={saving ? "loading" : "normal"}
              loadingText="保存中..."
              disabled={saveDisabled}
              onClick={onSave}
              className="inline-flex rounded-lg bg-[var(--theme-primary)] px-4 py-2 text-sm font-semibold text-[var(--theme-primary-foreground)]"
            >
              保存
            </LoadingButton>
          </PermissionGate>
        </div>
      </div>
    </header>
  );
}
