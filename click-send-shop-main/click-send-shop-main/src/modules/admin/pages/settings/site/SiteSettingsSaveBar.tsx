import { Tx } from "@/components/admin/AdminText";
import SiteSettingsSaveActions from "./SiteSettingsSaveActions";
import { useAdminT } from "@/hooks/useAdminT";

type Props = {
  saving: boolean;
  dirty: boolean;
  anyDirty: boolean;
  onSaveSection: () => void;
  onSaveAll: () => void;
  onDiscard?: () => void;
};

export default function SiteSettingsSaveBar({
  saving,
  dirty,
  anyDirty,
  onSaveSection,
  onSaveAll,
  onDiscard,
}: Props) {
  return (
    <div className="sticky bottom-0 z-10 -mx-4 border-t border-border bg-background/95 px-4 py-3 backdrop-blur-md md:rounded-2xl md:border md:px-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          {dirty ? <Tx>当前分组有未保存修改</Tx> : <Tx>当前分组已同步</Tx>}
          {anyDirty && !dirty ? <span className="ml-1"><Tx>（其它分组仍有未保存项）</Tx></span> : null}
        </p>
        <SiteSettingsSaveActions
          saving={saving}
          dirty={dirty}
          onSaveSection={onSaveSection}
          onSaveAll={onSaveAll}
          onDiscard={onDiscard}
        />
      </div>
    </div>
  );
}
