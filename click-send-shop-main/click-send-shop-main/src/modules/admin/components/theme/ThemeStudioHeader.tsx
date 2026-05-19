import { Copy, Eye, MoreHorizontal, Plus, Sparkles, Star, Trash2 } from "lucide-react";
import { useMemo } from "react";
import { LoadingButton } from "@/modules/micro-interactions";
import PermissionGate from "@/components/admin/PermissionGate";
import StoreBadge from "@/components/ui/StoreBadge";
import { THEME_BADGE_WARNING, THEME_OUTLINE_DANGER } from "@/utils/themeVisuals";

export type ThemeStudioHeaderProps = {
  skinName: string;
  isDefault: boolean;
  clientEnabled?: boolean;
  dirty: boolean;
  saving: boolean;
  saveDisabled?: boolean;
  onPreview: () => void;
  onSaveDraft: () => void;
  onSaveAndApply: () => void;
  onCopy: () => void;
  onAdd: () => void;
  onAddStarter?: () => void;
  onSetDefault: () => void;
  canDelete?: boolean;
  onDelete: () => void;
};

export default function ThemeStudioHeader({
  skinName,
  isDefault,
  clientEnabled = true,
  dirty,
  saving,
  saveDisabled,
  onPreview,
  onSaveDraft,
  onSaveAndApply,
  onCopy,
  onAdd,
  onAddStarter,
  onSetDefault,
  canDelete = true,
  onDelete,
}: ThemeStudioHeaderProps) {
  const statusText = useMemo(() => {
    if (dirty) return "有未保存修改";
    return "已同步";
  }, [dirty]);

  return (
    <header className="relative z-10 mb-4 rounded-2xl border border-border bg-card/95 p-4 shadow-sm backdrop-blur">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="text-xl font-bold text-foreground">皮肤设计</h1>
          <p className="text-sm text-muted-foreground">统一管理前台、移动端和管理后台的视觉风格</p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="max-w-[260px] truncate rounded-full border border-border bg-secondary/50 px-2.5 py-1 text-xs font-medium text-foreground">
              当前编辑：{skinName || "未命名皮肤"}
            </span>
            {isDefault ? <StoreBadge type="success">默认皮肤</StoreBadge> : null}
            {clientEnabled ? (
              <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">前台可切换</span>
            ) : null}
            {dirty ? (
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${THEME_BADGE_WARNING}`}>{statusText}</span>
            ) : (
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-700">{statusText}</span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onPreview}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border px-3 text-xs hover:bg-secondary"
          >
            <Eye size={14} />
            预览
          </button>

          <PermissionGate permission="settings.manage">
            <LoadingButton
              type="button"
              variant="outline"
              state={saving ? "loading" : "normal"}
              loadingText="保存中..."
              disabled={saveDisabled}
              onClick={onSaveDraft}
              className="inline-flex h-9 rounded-xl border border-border px-3 text-xs font-semibold"
            >
              保存草稿
            </LoadingButton>
            <LoadingButton
              type="button"
              variant="solid"
              state={saving ? "loading" : "normal"}
              loadingText="应用中..."
              disabled={saveDisabled}
              onClick={onSaveAndApply}
              className="inline-flex h-9 rounded-xl bg-[var(--theme-primary)] px-4 text-sm font-semibold text-[var(--theme-primary-foreground)]"
            >
              保存并应用
            </LoadingButton>
          </PermissionGate>

          <details className="group relative">
            <summary className="flex h-9 list-none cursor-pointer items-center gap-1 rounded-xl border border-border px-3 text-xs hover:bg-secondary">
              <MoreHorizontal size={14} />
              更多操作
            </summary>
            <div className="absolute right-0 z-20 mt-2 w-52 rounded-xl border border-border bg-card p-1 shadow-lg">
              <button type="button" onClick={onAdd} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs hover:bg-secondary">
                <Plus size={14} />
                新建皮肤
              </button>
              <button type="button" onClick={onCopy} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs hover:bg-secondary">
                <Copy size={14} />
                复制当前皮肤
              </button>
              {onAddStarter ? (
                <button type="button" onClick={onAddStarter} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs hover:bg-secondary">
                  <Sparkles size={14} />
                  从推荐模板新建
                </button>
              ) : null}
              {!isDefault ? (
                <button type="button" onClick={onSetDefault} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs hover:bg-secondary">
                  <Star size={14} />
                  设为默认皮肤
                </button>
              ) : null}
              <div className="my-1 h-px bg-border" />
              <button
                type="button"
                onClick={onDelete}
                disabled={!canDelete}
                className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs ${canDelete ? THEME_OUTLINE_DANGER : "cursor-not-allowed text-muted-foreground"}`}
              >
                <Trash2 size={14} />
                {canDelete ? "删除皮肤" : "默认皮肤不可删除"}
              </button>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
