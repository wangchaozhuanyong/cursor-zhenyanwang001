import { Copy } from "lucide-react";
import { toast } from "sonner";
import type { ThemeConfig } from "@/types/theme";
import { getContrastRatio } from "@/utils/themeContrast";
import { COLOR_FIELD_META, type ColorFieldKey } from "./themeStudioConstants";

type ColorFieldProps = {
  field: ColorFieldKey;
  value: string;
  config: ThemeConfig;
  onChange: (value: string) => void;
  highlighted?: boolean;
};

function contrastLabel(field: ColorFieldKey, config: ThemeConfig, value: string) {
  const meta = COLOR_FIELD_META[field];
  if (!meta.contrastBg) return null;
  const bgMap = {
    bg: config.bgColor,
    surface: config.surfaceColor,
    primary: config.primaryColor,
    danger: config.dangerColor,
  };
  const bg = bgMap[meta.contrastBg];
  const ratio = getContrastRatio(value, bg);
  const level = ratio >= 4.5 ? "达标" : ratio >= 3 ? "偏低" : "不足";
  const tone = ratio >= 4.5 ? "text-emerald-600" : ratio >= 3 ? "text-amber-600" : "text-red-600";
  return { text: `${level} ${ratio.toFixed(2)}:1`, tone };
}

export default function ColorField({ field, value, config, onChange, highlighted }: ColorFieldProps) {
  const meta = COLOR_FIELD_META[field];
  const color = /^#[0-9a-f]{6}$/i.test(value) ? value : "#000000";
  const contrast = contrastLabel(field, config, value);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success("已复制颜色值");
    } catch {
      toast.error("复制失败");
    }
  };

  return (
    <div
      id={`theme-field-${field}`}
      className={`rounded-lg border bg-background/60 p-3 transition-shadow ${
        highlighted ? "border-amber-400 ring-2 ring-amber-400/60" : "border-border"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-foreground">{meta.label}</p>
          <p className="font-mono text-[10px] text-muted-foreground">{field}</p>
        </div>
        {contrast ? (
          <span className={`shrink-0 text-[10px] font-medium ${contrast.tone}`}>{contrast.text}</span>
        ) : null}
      </div>
      <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{meta.hint}</p>
      <div className="mt-2 flex items-center gap-2">
        <input
          type="color"
          value={color}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="h-9 w-9 shrink-0 cursor-pointer rounded-md border border-border p-0.5"
          aria-label={`${meta.label} 色块`}
        />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 min-w-0 flex-1 rounded-md border border-border bg-background px-2 font-mono text-xs outline-none focus:ring-1 focus:ring-[var(--theme-primary)]"
          spellCheck={false}
        />
        <button
          type="button"
          onClick={() => void onCopy()}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border hover:bg-secondary"
          aria-label="复制颜色"
        >
          <Copy size={14} />
        </button>
      </div>
    </div>
  );
}
