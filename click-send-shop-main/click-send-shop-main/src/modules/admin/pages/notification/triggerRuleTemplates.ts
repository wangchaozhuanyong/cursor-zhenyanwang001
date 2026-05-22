import type { NotificationTriggerRule } from "@/services/admin/notificationService";

export function getTriggerTemplateDisplay(
  rule: NotificationTriggerRule,
  field: "title" | "content",
): string {
  const custom = (field === "title" ? rule.title : rule.content)?.trim() ?? "";
  if (custom) return field === "title" ? (rule.title ?? "") : (rule.content ?? "");
  return (field === "title" ? rule.default_title : rule.default_content) ?? "";
}

export function hasCustomTriggerTemplate(
  rule: NotificationTriggerRule,
  field: "title" | "content",
): boolean {
  return Boolean((field === "title" ? rule.title : rule.content)?.trim());
}

/** 保存时：与系统默认相同的文案不写入自定义字段，发送端继续走默认模板。 */
export function normalizeTriggerRuleForSave(rule: NotificationTriggerRule): NotificationTriggerRule {
  const titleInput = getTriggerTemplateDisplay(rule, "title").trim();
  const contentInput = getTriggerTemplateDisplay(rule, "content").trim();
  const defaultTitle = (rule.default_title ?? "").trim();
  const defaultContent = (rule.default_content ?? "").trim();

  return {
    ...rule,
    title: titleInput && titleInput !== defaultTitle ? titleInput : "",
    content: contentInput && contentInput !== defaultContent ? contentInput : "",
  };
}

export function patchTriggerRuleTemplate(
  rule: NotificationTriggerRule,
  field: "title" | "content",
  displayValue: string,
): NotificationTriggerRule {
  const defaultValue = (field === "title" ? rule.default_title : rule.default_content) ?? "";
  const trimmed = displayValue.trim();
  const isCustom = trimmed !== "" && trimmed !== defaultValue.trim();

  return {
    ...rule,
    [field]: isCustom ? displayValue : "",
  };
}
