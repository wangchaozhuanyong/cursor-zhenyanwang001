import { Maximize2, PanelRightClose, PanelRightOpen } from "lucide-react";
import { useEffect, useState } from "react";
import type { ThemeConfig } from "@/types/theme";
import ThemeHealthCheck from "./ThemeHealthCheck";
import ThemeHealthSummary from "./ThemeHealthSummary";
import ThemeRealRoutePreview from "./ThemeRealRoutePreview";
import type { PreviewDevice, PreviewMode } from "./themeStudioConstants";
import { Tx } from "@/components/admin/AdminText";
import { useAdminT } from "@/hooks/useAdminT";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

export type ThemePreviewDockProps = {
  config: ThemeConfig;
  skinKey: string;
  mode: PreviewMode;
  device: PreviewDevice;
  onModeChange: (m: PreviewMode) => void;
  onDeviceChange: (d: PreviewDevice) => void;
  onFullscreen?: () => void;
  onOptimizeTextContrast?: () => void;
};

export default function ThemePreviewDock({
  config,
  skinKey,
  mode,
  device,
  onModeChange,
  onDeviceChange,
  onFullscreen,
  onOptimizeTextContrast,
}: ThemePreviewDockProps) {
  const { tText } = useAdminT();
  const [collapsed, setCollapsed] = useState(false);
  const [healthOpen, setHealthOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 1279px)");
    const apply = () => setCollapsed(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  if (collapsed) {
    return (
      <UnifiedButton
        type="button"
        onClick={() => setCollapsed(false)}
        className="fixed bottom-6 right-4 z-20 inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-3 text-xs shadow-md 2xl:hidden"
      >
        <PanelRightOpen size={14} />
        打开预览
      </UnifiedButton>
    );
  }

  return (
    <aside className="w-full shrink-0 rounded-2xl border border-border bg-card shadow-sm 2xl:sticky 2xl:top-24 2xl:flex 2xl:h-[calc(100vh-112px)] 2xl:w-[clamp(560px,36vw,760px)] 2xl:flex-col 2xl:overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <p className="text-sm font-semibold text-foreground"><Tx>实时预览</Tx></p>
        <div className="flex items-center gap-1">
          {onFullscreen ? (
            <UnifiedButton type="button" onClick={onFullscreen} className="rounded-lg border border-border p-1.5 text-muted-foreground hover:bg-secondary" title={tText("全屏预览")}>
              <Maximize2 size={14} />
            </UnifiedButton>
          ) : null}
          <UnifiedButton type="button" onClick={() => setCollapsed(true)} className="rounded-lg border border-border p-1.5 text-muted-foreground hover:bg-secondary" title={tText("收起预览")}>
            <PanelRightClose size={14} />
          </UnifiedButton>
        </div>
      </div>

      <div className="p-2 2xl:min-h-0 2xl:flex-1 2xl:overflow-hidden">
        <ThemeRealRoutePreview
          config={config}
          skinKey={skinKey}
          mode={mode}
          device={device}
          onModeChange={onModeChange}
          onDeviceChange={onDeviceChange}
        />
      </div>

      <div className="border-t border-border p-2">
        <ThemeHealthSummary
          config={config}
          onOptimizeTextContrast={onOptimizeTextContrast}
          onToggleDetail={() => setHealthOpen((v) => !v)}
          detailOpen={healthOpen}
        />
        {healthOpen ? (
          <div className="mt-2 max-h-52 overflow-y-auto rounded-xl border border-border bg-background/50 p-2">
            <ThemeHealthCheck config={config} />
          </div>
        ) : null}
      </div>
    </aside>
  );
}
