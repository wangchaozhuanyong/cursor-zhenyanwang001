import { useState } from "react";
import type { ThemeConfig } from "@/types/theme";
import ThemeHealthCheck from "./ThemeHealthCheck";
import ThemePreviewCanvas from "./ThemePreviewCanvas";
import ThemePreviewToolbar from "./ThemePreviewToolbar";
import type { PreviewDevice, PreviewMode } from "./themeStudioConstants";
import { Tx } from "@/components/admin/AdminText";

export type ThemePreviewDockProps = {
  config: ThemeConfig;
  skinKey: string;
  mode: PreviewMode;
  device: PreviewDevice;
  onModeChange: (m: PreviewMode) => void;
  onDeviceChange: (d: PreviewDevice) => void;
  showHealth?: boolean;
  healthExpanded?: boolean;
};

export default function ThemePreviewDock({
  config,
  skinKey,
  mode,
  device,
  onModeChange,
  onDeviceChange,
  showHealth = true,
  healthExpanded = false,
}: ThemePreviewDockProps) {
  const [healthOpen, setHealthOpen] = useState(healthExpanded);
  return (
    <aside
      className="sticky top-[88px] z-10 flex h-[calc(100vh-110px)] w-full min-w-[420px] max-w-[520px] shrink-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm lg:w-[min(480px,38vw)]"
      aria-label="实时预览"
    >
      <ThemePreviewToolbar mode={mode} device={device} onModeChange={onModeChange} onDeviceChange={onDeviceChange} />
      <div className="min-h-0 flex-1 overflow-hidden p-2">
        <ThemePreviewCanvas config={config} mode={mode} device={device} skinKey={skinKey} />
      </div>
      {showHealth ? (
        <div className="shrink-0 border-t border-border">
          <button
            type="button"
            className="flex w-full items-center justify-between px-3 py-2 text-left text-xs font-medium text-foreground hover:bg-secondary/50"
            onClick={() => setHealthOpen((v) => !v)}
          ><Tx>
            皮肤健康检查
            </Tx><span className="text-muted-foreground">{healthOpen ? "收起" : "展开"}</span>
          </button>
          {healthOpen ? (
            <div className="max-h-36 overflow-y-auto px-2 pb-2">
              <ThemeHealthCheck config={config} />
            </div>
          ) : null}
        </div>
      ) : null}
    </aside>
  );
}
