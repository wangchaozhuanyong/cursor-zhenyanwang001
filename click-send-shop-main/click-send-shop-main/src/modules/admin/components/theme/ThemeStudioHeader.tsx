import { CheckCircle2, Eye, Gift, MonitorSmartphone } from "lucide-react";
import { useMemo } from "react";
import { LoadingButton } from "@/modules/micro-interactions";
import PermissionGate from "@/components/admin/PermissionGate";
import StoreBadge from "@/components/ui/StoreBadge";
import { THEME_BADGE_WARNING } from "@/utils/themeVisuals";

export type ThemeStudioHeaderProps = {
  skinName: string;
  activeSkinName: string;
  runtimeSkinName: string;
  isClientSkin: boolean;
  isHolidaySkin: boolean;
  dirty: boolean;
  saving: boolean;
  saveDisabled?: boolean;
  onPreview: () => void;
  onSave: () => void;
  onSetClientSkin: () => void;
  onSetHolidaySkin: () => void;
};

export default function ThemeStudioHeader({
  skinName,
  activeSkinName,
  runtimeSkinName,
  isClientSkin,
  isHolidaySkin,
  dirty,
  saving,
  saveDisabled,
  onPreview,
  onSave,
  onSetClientSkin,
  onSetHolidaySkin,
}: ThemeStudioHeaderProps) {
  const statusText = useMemo(() => {
    if (dirty) return "有未保存修改";
    return "已同步";
  }, [dirty]);

  return (
    <header className="relative z-10 mb-4 rounded-2xl border border-border bg-card/95 p-4 shadow-sm backdrop-blur">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="max-w-[260px] truncate rounded-full border border-border bg-secondary/50 px-2.5 py-1 text-xs font-medium text-foreground">
              当前编辑：{skinName || "未命名皮肤"}
            </span>
            {isClientSkin ? <StoreBadge type="success">客户端日常</StoreBadge> : null}
            {isHolidaySkin ? <StoreBadge type="warning">节日自动</StoreBadge> : null}
            {dirty ? (
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${THEME_BADGE_WARNING}`}>{statusText}</span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-700">
                <CheckCircle2 size={12} />
                {statusText}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            客户端日常：{activeSkinName || "-"}；当前实际生效：{runtimeSkinName || "-"}。节日命中时会优先使用节日自动皮肤。
          </p>
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
              variant="secondary"
              state={saving ? "loading" : "normal"}
              disabled={saveDisabled || isClientSkin}
              onClick={onSetClientSkin}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-background px-3 text-xs font-semibold hover:bg-secondary"
            >
              <MonitorSmartphone size={14} />
              设为默认
            </LoadingButton>
            <LoadingButton
              type="button"
              variant="secondary"
              state={saving ? "loading" : "normal"}
              disabled={saveDisabled || isHolidaySkin}
              onClick={onSetHolidaySkin}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-background px-3 text-xs font-semibold hover:bg-secondary"
            >
              <Gift size={14} />
              设为节日
            </LoadingButton>
            <LoadingButton
              type="button"
              variant="solid"
              state={saving ? "loading" : "normal"}
              loadingText="保存中..."
              disabled={saveDisabled}
              onClick={onSave}
              className="inline-flex h-9 rounded-xl bg-[var(--theme-primary)] px-4 text-sm font-semibold text-[var(--theme-primary-foreground)]"
            >
              保存配置
            </LoadingButton>
          </PermissionGate>
        </div>
      </div>
    </header>
  );
}
