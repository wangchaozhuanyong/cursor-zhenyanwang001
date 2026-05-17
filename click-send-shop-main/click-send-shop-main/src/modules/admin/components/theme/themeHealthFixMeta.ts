import type { AutoColorAction } from "@/utils/themeStudioAuto";
import { COLOR_FIELD_META, EDITOR_GROUP_LABELS, type ColorFieldKey, type EditorGroupId } from "./themeStudioConstants";

export type ThemeHealthFixTarget = {
  sectionId: EditorGroupId | "toolbar";
  fieldKeys?: ColorFieldKey[];
  autoAction?: AutoColorAction;
};

export const THEME_HEALTH_FIX_META: Record<string, ThemeHealthFixTarget> = {
  primary_button: { sectionId: "colors", fieldKeys: ["primaryColor"], autoAction: "foreground" },
  danger_button: { sectionId: "status", fieldKeys: ["dangerColor"] },
  body_on_page: { sectionId: "text", fieldKeys: ["textColor"], autoAction: "textContrast" },
  body_on_card: { sectionId: "text", fieldKeys: ["textColor", "surfaceColor"], autoAction: "textContrast" },
  muted_on_page: { sectionId: "text", fieldKeys: ["mutedTextColor"], autoAction: "textContrast" },
  border_distinct: { sectionId: "text", fieldKeys: ["borderColor"], autoAction: "border" },
  price_on_card: { sectionId: "colors", fieldKeys: ["priceColor"] },
  table_border: { sectionId: "text", fieldKeys: ["borderColor"], autoAction: "border" },
  dark_input: { sectionId: "text", fieldKeys: ["borderColor", "surfaceColor"], autoAction: "border" },
  light_button_text: { sectionId: "colors", fieldKeys: ["primaryColor"], autoAction: "foreground" },
};

const AUTO_ACTION_LABELS: Record<AutoColorAction, string> = {
  secondary: "自动生成辅色",
  accent: "自动生成强调色",
  border: "自动生成边框色",
  textContrast: "优化文字对比度",
  foreground: "生成前景色变量",
};

const CUSTOM_HINTS: Partial<Record<string, string>> = {
  body_on_card: "建议先调整“文字颜色”，必要时再调整“卡片背景”，也可使用“优化文字对比度”。",
  dark_input: "建议先调整“边框色”，深色主题下可同步微调“卡片背景”，也可使用“自动生成边框色”。",
};

export function getThemeHealthFixHint(checkId: string): string {
  if (CUSTOM_HINTS[checkId]) return CUSTOM_HINTS[checkId]!;

  const meta = THEME_HEALTH_FIX_META[checkId];
  if (!meta) return "请在编辑区调整相关颜色。";

  const sectionLabel = meta.sectionId === "toolbar" ? "顶部快捷工具" : EDITOR_GROUP_LABELS[meta.sectionId];
  const fields = meta.fieldKeys?.map((k) => COLOR_FIELD_META[k].label).join("、") ?? "";

  let hint = `建议前往「${sectionLabel}」`;
  if (fields) hint += `，优先调整「${fields}」`;
  if (meta.autoAction) hint += `；也可使用「${AUTO_ACTION_LABELS[meta.autoAction]}」`;
  return `${hint}。`;
}

export function getThemeHealthFixTarget(checkId: string): ThemeHealthFixTarget | undefined {
  return THEME_HEALTH_FIX_META[checkId];
}
