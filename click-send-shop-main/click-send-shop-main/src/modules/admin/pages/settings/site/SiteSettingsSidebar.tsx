import { cn } from "@/lib/utils";
import type { SiteSettingsSectionId } from "./siteSettingsSections";
import { SITE_SETTINGS_SECTIONS } from "./siteSettingsSections";
import { Tx } from "@/components/admin/AdminText";
import { useAdminT } from "@/hooks/useAdminT";

type Props = {
  activeId: SiteSettingsSectionId;
  dirtyMap: Partial<Record<SiteSettingsSectionId, boolean>>;
  onSelect: (id: SiteSettingsSectionId) => void;
  className?: string;
};

export default function SiteSettingsSidebar({ activeId, dirtyMap, onSelect, className }: Props) {
  const { tText } = useAdminT();
  return (
    <nav className={cn("space-y-0.5", className)}>
      {SITE_SETTINGS_SECTIONS.map((section) => {
        const active = section.id === activeId;
        const dirty = dirtyMap[section.id];
        return (
          <button
            key={section.id}
            type="button"
            onClick={() => onSelect(section.id)}
            className={cn(
              "flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
              active ? "bg-theme-price/15 font-semibold text-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
          >
            <span>{tText(section.title)}</span>
            {dirty ? <span className="h-2 w-2 shrink-0 rounded-full bg-theme-price" title={tText("未保存")} /> : null}
          </button>
        );
      })}
    </nav>
  );
}
