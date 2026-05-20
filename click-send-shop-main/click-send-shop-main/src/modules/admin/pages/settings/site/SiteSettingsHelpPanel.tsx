import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Tx } from "@/components/admin/AdminText";
import type { SiteSettings } from "@/types/admin";
import type { SiteSettingsSectionId } from "@/types/admin";
import { SECTION_HELP } from "./siteSettingsSections";
import TaxPreviewCard from "./TaxPreviewCard";
import SeoPreviewCard from "./SeoPreviewCard";

export type SiteSettingsHelpPanelProps = {
  sectionId: SiteSettingsSectionId;
  settings: SiteSettings;
  validationWarnings: string[];
};

function HelpPanelContent({ sectionId, settings, validationWarnings }: SiteSettingsHelpPanelProps) {
  const help = SECTION_HELP[sectionId];

  return (
    <>
      <div>
        <h3 className="text-sm font-semibold text-foreground"><Tx>前台影响</Tx></h3>
        <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-muted-foreground">
          {help.impacts.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>

      {help.required?.length ? (
        <div>
          <h3 className="text-sm font-semibold text-foreground"><Tx>必填检查</Tx></h3>
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            {help.required.map((line) => (
              <li key={line}>· {line}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {help.tips?.length ? (
        <div>
          <h3 className="text-sm font-semibold text-foreground"><Tx>建议</Tx></h3>
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            {help.tips.map((line) => (
              <li key={line}>· {line}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {sectionId === "footer" ? (
        <Link to="/admin/content" className="block text-xs font-medium text-theme-price hover:underline">
          <Tx>前往内容管理编辑政策正文 →</Tx>
        </Link>
      ) : null}

      {sectionId === "tax" ? <TaxPreviewCard settings={settings} /> : null}
      {sectionId === "seo" ? <SeoPreviewCard settings={settings} /> : null}

      {validationWarnings.length ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-800 dark:text-amber-100">
          {validationWarnings.map((w) => (
            <p key={w}>{w}</p>
          ))}
        </div>
      ) : null}
    </>
  );
}

/** 移动端：表单上方可折叠说明 */
export function SiteSettingsHelpPanelMobile(props: SiteSettingsHelpPanelProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className="xl:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground"
      >
        <Tx>说明与预览</Tx>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {open ? (
        <div className="mt-2 space-y-4 rounded-2xl border border-border bg-card p-4">
          <HelpPanelContent {...props} />
        </div>
      ) : null}
    </div>
  );
}

/** 桌面端：右侧 280px 说明栏 */
export default function SiteSettingsHelpPanel(props: SiteSettingsHelpPanelProps) {
  return (
    <aside className="hidden w-[280px] shrink-0 xl:block">
      <div className="sticky top-20 space-y-4 rounded-2xl border border-border bg-card p-4">
        <HelpPanelContent {...props} />
      </div>
    </aside>
  );
}
