import { LoadingButton } from "@/modules/micro-interactions";
import PermissionGate from "@/components/admin/PermissionGate";
import { Tx } from "@/components/admin/AdminText";
import { THEME_HOVER_TEXT_DANGER } from "@/utils/themeVisuals";
import { useAdminT } from "@/hooks/useAdminT";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

type Props = {
  saving: boolean;
  dirty: boolean;
  compact?: boolean;
  onSaveSection: () => void;
  onSaveAll: () => void;
  onDiscard?: () => void;
};

export default function SiteSettingsSaveActions({
  saving,
  dirty,
  compact,
  onSaveSection,
  onSaveAll,
  onDiscard,
}: Props) {
  return (
    <PermissionGate permission="settings.manage">
      <div className={`flex flex-wrap items-center gap-2 ${compact ? "" : "justify-end"}`}>
        {dirty && onDiscard ? (
          <UnifiedButton
            type="button"
            onClick={onDiscard}
            className={`rounded-xl border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-secondary ${THEME_HOVER_TEXT_DANGER}`}
          >
            <Tx>放弃修改</Tx>
          </UnifiedButton>
        ) : null}
        <LoadingButton
          type="button"
          variant="gold"
          state={saving ? "loading" : "normal"}
          loadingText="保存中..."
          onClick={onSaveSection}
          className="rounded-xl px-4 py-2 text-sm font-semibold"
        >
          <Tx>保存当前分组</Tx>
        </LoadingButton>
        <LoadingButton
          type="button"
          variant="outline"
          state={saving ? "loading" : "normal"}
          loadingText="保存中..."
          onClick={onSaveAll}
          className="rounded-xl border border-border px-4 py-2 text-sm font-medium"
        >
          <Tx>保存全部</Tx>
        </LoadingButton>
      </div>
    </PermissionGate>
  );
}
