import { X } from "lucide-react";
import { Tx } from "@/components/admin/AdminText";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import { useAdminT } from "@/hooks/useAdminT";
import type { ThemeConfig } from "@/types/theme";
import ThemeRealRoutePreview from "./ThemeRealRoutePreview";
import type { PreviewDevice, PreviewMode } from "./themeStudioConstants";

type Props = {
  open: boolean;
  config: ThemeConfig;
  skinKey: string;
  mode: PreviewMode;
  device: PreviewDevice;
  onModeChange: (mode: PreviewMode) => void;
  onDeviceChange: (device: PreviewDevice) => void;
  onClose: () => void;
};

export default function ThemeFullscreenPreview({
  open,
  config,
  skinKey,
  mode,
  device,
  onModeChange,
  onDeviceChange,
  onClose,
}: Props) {
  const { tText } = useAdminT();

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={tText("全屏预览")}
      className="fixed inset-0 z-[100] flex flex-col bg-background"
    >
      <header className="flex shrink-0 items-center gap-3 border-b border-border bg-card px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground"><Tx>全屏预览</Tx></p>
          <p className="text-xs text-muted-foreground"><Tx>真实前台 / 后台页面</Tx></p>
        </div>
        <UnifiedButton
          type="button"
          onClick={onClose}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-secondary"
          aria-label={tText("关闭")}
          title={tText("关闭")}
        >
          <X size={18} />
        </UnifiedButton>
      </header>
      <div className="min-h-0 flex-1 p-3">
        <ThemeRealRoutePreview
          config={config}
          skinKey={skinKey}
          mode={mode}
          device={device}
          onModeChange={onModeChange}
          onDeviceChange={onDeviceChange}
          fullscreen
        />
      </div>
    </div>
  );
}
