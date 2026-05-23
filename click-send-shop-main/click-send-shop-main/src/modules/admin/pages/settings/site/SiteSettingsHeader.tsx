import { ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { Tx } from "@/components/admin/AdminText";
import { useAdminT } from "@/hooks/useAdminT";
import SiteSettingsSaveActions from "./SiteSettingsSaveActions";

type Props = {
  sectionTitle: string;
  saving: boolean;
  dirty: boolean;
  onSaveSection: () => void;
  onSaveAll: () => void;
  onDiscard?: () => void;
};

export default function SiteSettingsHeader({
  sectionTitle,
  saving,
  dirty,
  onSaveSection,
  onSaveAll,
  onDiscard,
}: Props) {
  const { tText } = useAdminT();
  return (
    <div className="flex flex-col gap-4 border-b border-border pb-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0">
        <h1 className="text-xl font-bold text-foreground"><Tx>站点设置</Tx></h1>
        <p className="mt-1 text-sm text-muted-foreground">
          <Tx>当前分组：</Tx>
          <span className="font-medium text-foreground">{tText(sectionTitle)}</span>
          {dirty ? <span className="ml-2 text-theme-price">●</span> : null}
        </p>
        <Link
          to="/"
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex items-center gap-1.5 text-xs text-theme-price hover:underline"
        >
          <ExternalLink size={12} />
          <Tx>预览前台</Tx>
        </Link>
      </div>
      <div className="hidden shrink-0 md:block">
        <SiteSettingsSaveActions
          saving={saving}
          dirty={dirty}
          compact
          onSaveSection={onSaveSection}
          onSaveAll={onSaveAll}
          onDiscard={onDiscard}
        />
      </div>
    </div>
  );
}
