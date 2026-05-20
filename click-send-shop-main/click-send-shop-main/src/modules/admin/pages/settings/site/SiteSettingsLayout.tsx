import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { SiteSettingsSectionId } from "./siteSettingsSections";
import { SITE_SETTINGS_SECTIONS } from "./siteSettingsSections";
import SiteSettingsSidebar from "./SiteSettingsSidebar";

type Props = {
  activeSectionId: SiteSettingsSectionId;
  dirtyMap: Partial<Record<SiteSettingsSectionId, boolean>>;
  onSectionChange: (id: SiteSettingsSectionId) => void;
  header: ReactNode;
  saveBar: ReactNode;
  helpPanel: ReactNode;
  children: ReactNode;
};

export default function SiteSettingsLayout({
  activeSectionId,
  dirtyMap,
  onSectionChange,
  header,
  saveBar,
  helpPanel,
  children,
}: Props) {
  return (
    <div className="pb-28">
      {header}

      {/* Mobile tabs */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1 lg:hidden">
        {SITE_SETTINGS_SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onSectionChange(s.id)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-xs whitespace-nowrap",
              s.id === activeSectionId
                ? "border-gold bg-theme-price/15 font-medium text-foreground"
                : "border-border text-muted-foreground",
            )}
          >
            {s.title}
            {dirtyMap[s.id] ? " ●" : ""}
          </button>
        ))}
      </div>

      <div className="flex gap-6">
        <SiteSettingsSidebar
          activeId={activeSectionId}
          dirtyMap={dirtyMap}
          onSelect={onSectionChange}
          className="hidden w-[220px] shrink-0 lg:block"
        />

        <div className="min-w-0 flex-1 space-y-4">{children}</div>

        {helpPanel}
      </div>

      <div className="mt-6">{saveBar}</div>
    </div>
  );
}
