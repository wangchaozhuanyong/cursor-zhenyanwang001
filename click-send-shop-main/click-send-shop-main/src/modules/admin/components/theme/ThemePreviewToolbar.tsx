import { useThemeStudioLabel } from "@/hooks/useThemeStudioLabel";
import type { PreviewDevice, PreviewMode } from "./themeStudioConstants";
import { PREVIEW_DEVICE_LABELS, PREVIEW_MODE_LABELS } from "./themeStudioConstants";

type Props = {
  mode: PreviewMode;
  device: PreviewDevice;
  onModeChange: (m: PreviewMode) => void;
  onDeviceChange: (d: PreviewDevice) => void;
};

export default function ThemePreviewToolbar({ mode, device, onModeChange, onDeviceChange }: Props) {
  const tl = useThemeStudioLabel();
  return (
    <div className="shrink-0 space-y-2 border-b border-border p-3">
      <div className="flex flex-wrap gap-1">
        {(Object.keys(PREVIEW_MODE_LABELS) as PreviewMode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => onModeChange(m)}
            className={`rounded-full px-2.5 py-1 text-[10px] font-medium transition ${
              mode === m ? "bg-[var(--theme-primary)] text-[var(--theme-primary-foreground)]" : "bg-secondary text-muted-foreground"
            }`}
          >
            {tl(PREVIEW_MODE_LABELS[m])}
          </button>
        ))}
      </div>
      <div className="flex gap-1">
        {(Object.keys(PREVIEW_DEVICE_LABELS) as PreviewDevice[]).map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => onDeviceChange(d)}
            className={`flex-1 rounded-lg py-1 text-[10px] ${
              device === d ? "bg-secondary font-semibold text-foreground" : "text-muted-foreground"
            }`}
          >
            {tl(PREVIEW_DEVICE_LABELS[d])}
          </button>
        ))}
      </div>
    </div>
  );
}
