import { useEffect, useMemo, useState } from "react";
import {
  AlignCenter,
  AlignLeft,
  Loader2,
  Maximize,
  Minimize,
  Moon,
  Palette,
  RotateCcw,
  Save,
  Sun,
  Type,
  Square,
  LayoutGrid,
} from "lucide-react";
import { toast } from "sonner";
import PermissionGate from "@/components/admin/PermissionGate";
import { fetchActiveThemeConfig, saveSystemThemeConfig } from "@/services/admin/themeService";
import type { ThemeConfig } from "@/types/theme";
import banner1 from "@/assets/banner1.jpg";
import banner2 from "@/assets/banner2.jpg";

const DEFAULT_THEME_CONFIG: ThemeConfig = {
  radius: "8px",
  fontFamily: "inter",
  shadowStyle: "soft",
  imageRatio: "1 / 1",
  cardStyle: "bordered",
  cardTextAlign: "left",
  imageFit: "cover",
  light: {
    primaryColor: "#000000",
    secondaryColor: "#4B5563",
    priceColor: "#DC2626",
    bgColor: "#F9FAFB",
    surfaceColor: "#FFFFFF",
    borderColor: "auto",
  },
  dark: {
    primaryColor: "#FFFFFF",
    secondaryColor: "#D1D5DB",
    priceColor: "#EF4444",
    bgColor: "#0A0A0A",
    surfaceColor: "#171717",
    borderColor: "auto",
  },
};

const fontsList = [
  { label: "系统默认 (System)", val: "system", font: "system-ui, -apple-system, sans-serif" },
  { label: "现代科技 (Inter)", val: "inter", font: "'Inter', sans-serif" },
  { label: "先锋几何 (Space Grotesk)", val: "space", font: "'Space Grotesk', sans-serif" },
  { label: "奢华高定 (Playfair)", val: "playfair", font: "'Playfair Display', serif" },
  { label: "法式优雅 (Cormorant)", val: "cormorant", font: "'Cormorant Garamond', serif" },
  { label: "复古雕刻 (Cinzel)", val: "cinzel", font: "'Cinzel', serif" },
  { label: "亲和圆润 (Outfit)", val: "outfit", font: "'Outfit', sans-serif" },
  { label: "独立个性 (Syne)", val: "syne", font: "'Syne', sans-serif" },
  { label: "极客代码 (JetBrains)", val: "jetbrains", font: "'JetBrains Mono', monospace" },
  { label: "有机自然 (Fraunces)", val: "fraunces", font: "'Fraunces', serif" },
];

const radiusList = ["0px", "2px", "4px", "6px", "8px", "12px", "16px", "20px", "24px", "32px"];
const imageRatioList = ["1 / 1", "4 / 5", "3 / 4", "16 / 9"];
const shadowStyleList: Array<{ value: ThemeConfig["shadowStyle"]; label: string; desc: string }> = [
  { value: "soft", label: "柔和阴影", desc: "电商常规，层次更自然" },
  { value: "flat", label: "扁平无影", desc: "极简风格，更克制" },
  { value: "brutalism", label: "硬朗投影", desc: "强对比，适合品牌表达" },
];

function parseToRGB(colorStr: string) {
  let r = 255;
  let g = 255;
  let b = 255;
  if (!colorStr) return { r, g, b };

  const hexMatch = colorStr.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})?$/i);
  if (hexMatch) {
    r = Number.parseInt(hexMatch[1], 16);
    g = Number.parseInt(hexMatch[2], 16);
    b = Number.parseInt(hexMatch[3], 16);
  } else {
    const rgbMatch = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    if (rgbMatch) {
      r = Number.parseInt(rgbMatch[1], 10);
      g = Number.parseInt(rgbMatch[2], 10);
      b = Number.parseInt(rgbMatch[3], 10);
    }
  }
  return { r, g, b };
}

function getBrightness(colorStr: string) {
  const { r, g, b } = parseToRGB(colorStr);
  return (r * 299 + g * 587 + b * 114) / 1000;
}

function adjustColor(colorStr: string, amount: number) {
  const { r, g, b } = parseToRGB(colorStr);
  const clamp = (val: number) => Math.min(255, Math.max(0, val));
  return `rgb(${clamp(r + amount)}, ${clamp(g + amount)}, ${clamp(b + amount)})`;
}

function getShadowVariables(style: string, isDark: boolean) {
  if (style === "flat") return { shadow: "none", shadowHover: "none" };
  if (style === "brutalism") {
    const color = isDark ? "rgba(255,255,255,0.9)" : "#000000";
    return { shadow: `4px 4px 0px ${color}`, shadowHover: `6px 6px 0px ${color}` };
  }
  const shadowColor = isDark ? "rgba(0,0,0,0.8)" : "rgba(0,0,0,0.06)";
  const shadowHoverColor = isDark ? "rgba(0,0,0,0.95)" : "rgba(0,0,0,0.12)";
  return {
    shadow: `0 10px 30px -10px ${shadowColor}`,
    shadowHover: `0 20px 40px -10px ${shadowHoverColor}`,
  };
}

type PreviewPalette = Record<string, string>;
function generateThemePalette(adminConfig: ThemeConfig, userMode: "light" | "dark"): PreviewPalette {
  const currentColors = userMode === "dark" ? adminConfig.dark : adminConfig.light;
  const { primaryColor, secondaryColor, priceColor, bgColor, surfaceColor, borderColor } = currentColors;
  const isDarkBg = getBrightness(bgColor) < 128;
  const computedBorder =
    borderColor && borderColor !== "auto" && borderColor.trim() !== ""
      ? borderColor
      : isDarkBg
        ? adjustColor(bgColor, 30)
        : adjustColor(bgColor, -15);
  const fontObj = fontsList.find((f) => f.val === adminConfig.fontFamily) || fontsList[0];
  const shadowVars = getShadowVariables(adminConfig.shadowStyle, isDarkBg);

  return {
    "--theme-primary": primaryColor,
    "--theme-secondary": secondaryColor,
    "--theme-price": priceColor,
    "--theme-gradient": `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
    "--theme-bg": bgColor,
    "--theme-surface": surfaceColor,
    "--theme-border": computedBorder,
    "--theme-text": isDarkBg ? "#FFFFFF" : "#000000",
    "--theme-text-muted": isDarkBg ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.55)",
    "--theme-radius": adminConfig.radius,
    "--theme-font": fontObj.font,
    "--theme-image-ratio": adminConfig.imageRatio,
    "--theme-card-align": adminConfig.cardTextAlign,
    "--theme-shadow": shadowVars.shadow,
    "--theme-shadow-hover": shadowVars.shadowHover,
  };
}

function AdvancedColorInput({
  label,
  value,
  onChange,
  placeholder,
  allowAuto,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  allowAuto?: boolean;
}) {
  const isHex = /^#[0-9A-F]{6}$/i.test(value);
  const colorPickerValue = isHex ? value : "#000000";
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-bold uppercase text-muted-foreground flex items-center justify-between">
        {label}
        {allowAuto ? <span className="text-[10px] font-normal">留空填 auto</span> : null}
      </span>
      <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-2 py-1.5">
        <input
          type="color"
          value={colorPickerValue}
          onChange={(e) => onChange(e.target.value)}
          className={`h-8 w-8 cursor-pointer rounded border-none p-0 ${!isHex ? "opacity-50" : ""}`}
          title={!isHex ? "当前为非 HEX 颜色" : "选择颜色"}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent text-xs font-mono font-bold outline-none"
        />
      </div>
    </div>
  );
}

export default function AdminThemeSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [themeConfig, setThemeConfig] = useState<ThemeConfig>(DEFAULT_THEME_CONFIG);
  const [previewMode, setPreviewMode] = useState<"light" | "dark">("light");
  const [editingMode, setEditingMode] = useState<"light" | "dark">("light");

  useEffect(() => {
    setLoading(true);
    fetchActiveThemeConfig()
      .then((data) => {
        if (data) setThemeConfig({ ...DEFAULT_THEME_CONFIG, ...data });
      })
      .catch(() => toast.error("加载主题配置失败"))
      .finally(() => setLoading(false));
  }, []);

  const palette = useMemo(() => generateThemePalette(themeConfig, previewMode), [themeConfig, previewMode]);
  const previewImage = previewMode === "dark" ? banner2 : banner1;

  const updateThemeConfig = (mode: "light" | "dark", field: string, value: string) => {
    setThemeConfig((prev) => ({
      ...prev,
      [mode]: {
        ...prev[mode],
        [field]: value,
      },
    }));
  };

  const saveTheme = async () => {
    setSaving(true);
    try {
      await saveSystemThemeConfig(themeConfig);
      toast.success("主题配置已保存");
    } catch {
      toast.error("保存失败，请稍后重试");
    } finally {
      setSaving(false);
    }
  };

  const resetToDefault = () => {
    if (window.confirm("确定恢复默认主题配置？")) {
      setThemeConfig(DEFAULT_THEME_CONFIG);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">皮肤/视觉设置</h1>
          <p className="text-sm text-muted-foreground">双轨配色、字体、倒角、卡片外框和图文布局统一配置。</p>
        </div>
        <button
          type="button"
          onClick={resetToDefault}
          className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-secondary flex items-center gap-2"
        >
          <RotateCcw size={14} /> 恢复默认
        </button>
      </div>

      <div className="grid gap-6 2xl:grid-cols-[1fr_420px]">
        <div className="space-y-6">
          <section className="rounded-xl border border-border bg-card p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-2"><Palette size={16} /> 配色编辑区</h3>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingMode("light")}
                  className={`rounded-md border p-1.5 ${editingMode === "light" ? "border-gold text-gold" : "border-border"}`}
                >
                  <Sun size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setEditingMode("dark")}
                  className={`rounded-md border p-1.5 ${editingMode === "dark" ? "border-gold text-gold" : "border-border"}`}
                >
                  <Moon size={14} />
                </button>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <AdvancedColorInput
                label="背景色"
                value={themeConfig[editingMode].bgColor}
                onChange={(v) => updateThemeConfig(editingMode, "bgColor", v)}
              />
              <AdvancedColorInput
                label="表面色"
                value={themeConfig[editingMode].surfaceColor}
                onChange={(v) => updateThemeConfig(editingMode, "surfaceColor", v)}
              />
              <AdvancedColorInput
                label="主色"
                value={themeConfig[editingMode].primaryColor}
                onChange={(v) => updateThemeConfig(editingMode, "primaryColor", v)}
              />
              <AdvancedColorInput
                label="辅色"
                value={themeConfig[editingMode].secondaryColor}
                onChange={(v) => updateThemeConfig(editingMode, "secondaryColor", v)}
              />
              <AdvancedColorInput
                label="边框色"
                value={themeConfig[editingMode].borderColor}
                onChange={(v) => updateThemeConfig(editingMode, "borderColor", v)}
                allowAuto
              />
              <AdvancedColorInput
                label="价格色"
                value={themeConfig[editingMode].priceColor}
                onChange={(v) => updateThemeConfig(editingMode, "priceColor", v)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              当前正在编辑：{editingMode === "light" ? "浅色模式" : "深色模式"}。预览可独立切换，不会影响编辑状态。
            </p>
          </section>

          <div className="grid gap-4 md:grid-cols-2">
            <section className="rounded-xl border border-border bg-card p-4 space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2"><Type size={16} /> 排版引擎</h3>
              <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                {fontsList.map((f) => (
                  <button
                    key={f.val}
                    type="button"
                    onClick={() => setThemeConfig((prev) => ({ ...prev, fontFamily: f.val }))}
                    className={`w-full rounded-lg border px-3 py-2 text-left ${themeConfig.fontFamily === f.val ? "border-gold bg-gold/10" : "border-border"}`}
                  >
                    <div className="font-semibold" style={{ fontFamily: f.font }}>{f.label}</div>
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-border bg-card p-4 space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2"><Square size={16} /> 倒角系统</h3>
              <div className="grid grid-cols-2 gap-2">
                {radiusList.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setThemeConfig((prev) => ({ ...prev, radius: r }))}
                    className={`rounded-md border px-2 py-2 text-xs ${themeConfig.radius === r ? "border-gold bg-gold/10" : "border-border"}`}
                    style={{ borderRadius: r }}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </section>
          </div>

          <section className="rounded-xl border border-border bg-card p-4 space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2"><LayoutGrid size={16} /> 卡片微架构</h3>
            <div className="grid gap-3 md:grid-cols-2">
              {[
                { val: "bordered", label: "基础线框" },
                { val: "elevated", label: "悬浮光影" },
                { val: "minimal", label: "极简底线" },
                { val: "seamless", label: "无界融入" },
              ].map((s) => (
                <button
                  key={s.val}
                  type="button"
                  onClick={() => setThemeConfig((prev) => ({ ...prev, cardStyle: s.val as ThemeConfig["cardStyle"] }))}
                  className={`rounded-lg border px-3 py-2 text-left ${themeConfig.cardStyle === s.val ? "border-gold bg-gold/10" : "border-border"}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">阴影风格</p>
                <div className="grid gap-2">
                  {shadowStyleList.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setThemeConfig((prev) => ({ ...prev, shadowStyle: s.value }))}
                      className={`rounded-md border p-2 text-left ${
                        themeConfig.shadowStyle === s.value ? "border-gold bg-gold/10" : "border-border"
                      }`}
                    >
                      <div className="text-xs font-semibold">{s.label}</div>
                      <div className="text-[11px] text-muted-foreground">{s.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">内容对齐</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setThemeConfig((prev) => ({ ...prev, cardTextAlign: "left" }))}
                    className={`flex-1 rounded-md border p-2 flex justify-center ${themeConfig.cardTextAlign === "left" ? "border-gold text-gold" : "border-border"}`}
                  >
                    <AlignLeft size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setThemeConfig((prev) => ({ ...prev, cardTextAlign: "center" }))}
                    className={`flex-1 rounded-md border p-2 flex justify-center ${themeConfig.cardTextAlign === "center" ? "border-gold text-gold" : "border-border"}`}
                  >
                    <AlignCenter size={16} />
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">图片填充</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setThemeConfig((prev) => ({ ...prev, imageFit: "cover" }))}
                    className={`flex-1 rounded-md border p-2 flex justify-center ${themeConfig.imageFit === "cover" ? "border-gold text-gold" : "border-border"}`}
                  >
                    <Maximize size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setThemeConfig((prev) => ({ ...prev, imageFit: "contain" }))}
                    className={`flex-1 rounded-md border p-2 flex justify-center ${themeConfig.imageFit === "contain" ? "border-gold text-gold" : "border-border"}`}
                  >
                    <Minimize size={16} />
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">图片比例</p>
                <div className="grid grid-cols-2 gap-2">
                  {imageRatioList.map((ratio) => (
                    <button
                      key={ratio}
                      type="button"
                      onClick={() => setThemeConfig((prev) => ({ ...prev, imageRatio: ratio }))}
                      className={`rounded-md border p-2 text-xs ${
                        themeConfig.imageRatio === ratio ? "border-gold text-gold" : "border-border"
                      }`}
                    >
                      {ratio}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>

        <section
          className="rounded-xl border border-border bg-card p-4 space-y-4 2xl:sticky 2xl:top-20 h-fit"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">实时预览（{previewMode === "light" ? "浅色" : "深色"}）</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPreviewMode("light")}
                className={`rounded-md border p-1.5 ${previewMode === "light" ? "border-gold text-gold" : "border-border"}`}
              >
                <Sun size={14} />
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode("dark")}
                className={`rounded-md border p-1.5 ${previewMode === "dark" ? "border-gold text-gold" : "border-border"}`}
              >
                <Moon size={14} />
              </button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            已内置默认预览图（本地资源），不依赖外网图片，深色模式也可稳定预览。
          </p>
          <div
            className="rounded-xl border p-3 space-y-3"
            style={{
              background: palette["--theme-bg"],
              color: palette["--theme-text"],
              borderColor: palette["--theme-border"],
              fontFamily: palette["--theme-font"],
            }}
          >
            <div className="grid gap-4">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="flex flex-col gap-3 p-3"
              style={{
                background: themeConfig.cardStyle === "seamless" ? "transparent" : palette["--theme-surface"],
                border: themeConfig.cardStyle === "elevated" || themeConfig.cardStyle === "seamless" ? "none" : `1px solid ${palette["--theme-border"]}`,
                borderRadius: palette["--theme-radius"],
                boxShadow: themeConfig.cardStyle === "minimal" || themeConfig.cardStyle === "seamless" ? "none" : palette["--theme-shadow"],
              }}
            >
              <div
                className="w-full overflow-hidden"
                style={{ aspectRatio: palette["--theme-image-ratio"], background: palette["--theme-surface"], borderRadius: palette["--theme-radius"] }}
              >
                <img
                  src={previewImage}
                  alt="preview"
                  className="h-full w-full"
                  style={{ objectFit: themeConfig.imageFit }}
                />
              </div>
              <div className={`flex flex-col gap-2 ${themeConfig.cardTextAlign === "center" ? "items-center text-center" : "items-start text-left"}`}>
                <h4 className="font-bold">视觉引擎商品卡片预览</h4>
                <p style={{ color: palette["--theme-text-muted"] }}>无 absolute 脱流排版，纯文档流布局。</p>
                <div className="flex w-full items-end justify-between gap-2">
                  <div className="flex flex-col">
                    <span className="line-through text-xs" style={{ color: palette["--theme-text-muted"] }}>¥1299</span>
                    <span className="text-lg font-bold" style={{ color: palette["--theme-price"] }}>¥999</span>
                  </div>
                  <button
                    type="button"
                    className="rounded-md px-3 py-1.5 text-sm text-white"
                    style={{ background: palette["--theme-gradient"] }}
                  >
                    加购
                  </button>
                </div>
              </div>
            </div>
          ))}
            </div>
          </div>
        </section>
      </div>

      <div className="sticky bottom-0 -mx-6 border-t border-border bg-background/95 px-6 py-4 backdrop-blur-md">
        <div className="flex items-center justify-end">
          <PermissionGate permission="settings.manage">
            <button
              type="button"
              onClick={saveTheme}
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-gold px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save size={14} />}
              保存皮肤配置
            </button>
          </PermissionGate>
        </div>
      </div>
    </div>
  );
}

