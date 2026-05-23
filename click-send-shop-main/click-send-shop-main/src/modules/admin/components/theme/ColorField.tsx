import { Copy } from "lucide-react";
import { toast } from "sonner";
import type { ThemeConfig } from "@/types/theme";
import { getContrastRatio } from "@/utils/themeContrast";
import AdminFieldHint from "@/components/admin/AdminFieldHint";
import { COLOR_FIELD_META, type ColorFieldKey } from "./themeStudioConstants";
import { Tx } from "@/components/admin/AdminText";
import { useAdminT } from "@/hooks/useAdminT";

type ColorFieldProps = {
  field: ColorFieldKey;
  value: string;
  config: ThemeConfig;
  onChange: (value: string) => void;
  highlighted?: boolean;
};

const COMMON_COLORS = ["#111827", "#2563EB", "#10B981", "#F59E0B", "#EF4444", "#FFFFFF", "#F8FAFC"];

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
  const { tText } = useAdminT();
  const meta = COLOR_FIELD_META[field];
  const isValidHex = /^#[0-9a-f]{6}$/i.test(value.trim());
  const color = isValidHex ? value.trim() : "#000000";
  const contrast = isValidHex ? contrastLabel(field, config, value.trim()) : null;

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(tText("已复制颜色值"));
    } catch {
      toast.error(tText("复制失败"));
    }
  };

  return (
    <div
      id={`theme-field-${field}`}
      className={`rounded-xl border bg-background/60 p-2.5 transition-shadow ${highlighted ? "border-amber-400 ring-2 ring-amber-400/60" : "border-border"}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5">
            <p className="text-xs font-semibold text-foreground">{meta.label}</p>
            <AdminFieldHint text={meta.hint} />
          </div>
          <p className="font-mono text-[10px] text-muted-foreground">{field}</p>
        </div>
        {contrast ? <span className={`shrink-0 text-[10px] font-medium ${contrast.tone}`}>{contrast.text}</span> : null}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <input
          type="color"
          value={color}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="h-8 w-8 shrink-0 cursor-pointer rounded-md border border-border p-0.5"
          aria-label={`${meta.label} 色块`}
        />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`h-8 min-w-0 flex-1 rounded-md border bg-background px-2 font-mono text-xs outline-none focus:ring-1 focus:ring-[var(--theme-primary)] ${isValidHex ? "border-border" : "border-red-400"}`}
          spellCheck={false}
        />
        <button type="button" onClick={() => void onCopy()} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border hover:bg-secondary" aria-label={tText("复制颜色")}>
          <Copy size={14} />
        </button>
      </div>
      {!isValidHex ? <p className="mt-1 text-[10px] text-red-600"><Tx>HEX 格式无效，请使用 `#RRGGBB`。</Tx></p> : null}
      <div className="mt-1.5 flex flex-wrap gap-1">
        {COMMON_COLORS.map((item) => (
          <button key={item} type="button" onClick={() => onChange(item)} title={`使用 ${item}`} className="h-4 w-4 rounded-full border border-black/10" style={{ backgroundColor: item }} />
        ))}
      </div>
    </div>
  );
}
