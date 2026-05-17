import type { AutoColorAction } from "@/utils/themeStudioAuto";
import { COLOR_FIELD_META, EDITOR_GROUP_LABELS, type ColorFieldKey, type EditorGroupId } from "./themeStudioConstants";

export type ThemeHealthFixTarget = {
  sectionId: EditorGroupId | "toolbar";
  fieldKeys?: ColorFieldKey[];
  autoAction?: AutoColorAction;
};

export const THEME_HEALTH_FIX_META: Record<string, ThemeHealthFixTarget> = {
  primary_button: {
    sectionId: "colors",
    fieldKeys: ["primaryColor"],
    autoAction: "foreground",
  },
  danger_button: {
    sectionId: "status",
    fieldKeys: ["dangerColor"],
  },
  body_on_page: {
    sectionId: "text",
    fieldKeys: ["textColor"],
    autoAction: "textContrast",
  },
  body_on_card: {
    sectionId: "text",
    fieldKeys: ["textColor", "surfaceColor"],
    autoAction: "textContrast",
  },
  muted_on_page: {
    sectionId: "text",
    fieldKeys: ["mutedTextColor"],
    autoAction: "textContrast",
  },
  border_distinct: {
    sectionId: "text",
    fieldKeys: ["borderColor"],
    autoAction: "border",
  },
  price_on_card: {
    sectionId: "colors",
    fieldKeys: ["priceColor"],
  },
  table_border: {
    sectionId: "text",
    fieldKeys: ["borderColor"],
    autoAction: "border",
  },
  dark_input: {
    sectionId: "text",
    fieldKeys: ["borderColor", "surfaceColor"],
    autoAction: "border",
  },
  light_button_text: {
    sectionId: "colors",
    fieldKeys: ["primaryColor"],
    autoAction: "foreground",
  },
};

const AUTO_ACTION_LABELS: Record<AutoColorAction, string> = {
  secondary: "自动生成辅色",
  accent: "自动生成强调色",
  border: "自动生成边框色",
  textContrast: "优化文字对比度",
  foreground: "生成前景色变量",
};

const CUSTOM_HINTS: Partial<Record<string, string>> = {
  body_on_card:
    "去修改：展开「文字与边框」→「正文色」；若仍不足，再展开「基础颜色」→「卡片背景」。也可点顶部「优化文字对比度」一键修复。",
  dark_input:
    "去修改：展开「文字与边框」→「边框色」；深色皮肤下可同时调整「基础颜色」→「卡片背景」。也可点顶部「自动生成边框色」一键修复。",
};

export function getThemeHealthFixHint(checkId: string): string {
  if (CUSTOM_HINTS[checkId]) return CUSTOM_HINTS[checkId]!;

  const meta = THEME_HEALTH_FIX_META[checkId];
  if (!meta) return "请在左侧编辑区调整相关颜色。";

  const sectionLabel =
    meta.sectionId === "toolbar" ? "顶部快捷工具" : EDITOR_GROUP_LABELS[meta.sectionId];
  const fields =
    meta.fieldKeys?.map((k) => COLOR_FIELD_META[k].label).join("、") ?? "";

  let hint = `去修改：展开左侧「${sectionLabel}」`;
  if (fields) hint += `，调整「${fields}」`;
  if (meta.autoAction) {
    hint += `；也可点顶部「${AUTO_ACTION_LABELS[meta.autoAction]}」一键修复`;
  }
  return `${hint}。`;
}

export function getThemeHealthFixTarget(checkId: string): ThemeHealthFixTarget | undefined {
  return THEME_HEALTH_FIX_META[checkId];
}
