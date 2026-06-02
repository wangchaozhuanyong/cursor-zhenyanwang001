import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import {
  ADMIN_FILTER_BUTTON_CARD_CLASS,
  ADMIN_FILTER_BUTTON_CLASS,
  ADMIN_FILTER_CONTROL_CARD_CLASS,
  ADMIN_FILTER_CONTROL_CLASS,
  ADMIN_FILTER_THEME_BG_BUTTON_CLASS,
  ADMIN_FILTER_THEME_BG_CONTROL_CLASS,
  ADMIN_FILTER_THEME_BUTTON_CLASS,
  ADMIN_FILTER_THEME_CONTROL_CLASS,
} from "@/utils/adminFilterControlClasses";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

type AdminFilterVariant = "default" | "card" | "theme" | "themeBg";

const CONTROL_CLASS_MAP: Record<AdminFilterVariant, string> = {
  default: ADMIN_FILTER_CONTROL_CLASS,
  card: ADMIN_FILTER_CONTROL_CARD_CLASS,
  theme: ADMIN_FILTER_THEME_CONTROL_CLASS,
  themeBg: ADMIN_FILTER_THEME_BG_CONTROL_CLASS,
};

const BUTTON_CLASS_MAP: Record<AdminFilterVariant, string> = {
  default: ADMIN_FILTER_BUTTON_CLASS,
  card: ADMIN_FILTER_BUTTON_CARD_CLASS,
  theme: ADMIN_FILTER_THEME_BUTTON_CLASS,
  themeBg: ADMIN_FILTER_THEME_BG_BUTTON_CLASS,
};

type AdminFilterInputProps = ComponentProps<"input"> & {
  variant?: AdminFilterVariant;
};

export function AdminFilterInput({
  variant = "default",
  className,
  ...props
}: AdminFilterInputProps) {
  return <input {...props} className={cn(CONTROL_CLASS_MAP[variant], className)} />;
}

type AdminFilterSelectProps = ComponentProps<"select"> & {
  variant?: AdminFilterVariant;
};

export function AdminFilterSelect({
  variant = "default",
  className,
  children,
  ...props
}: AdminFilterSelectProps) {
  return (
    <select {...props} className={cn(CONTROL_CLASS_MAP[variant], className)}>
      {children}
    </select>
  );
}

type AdminFilterButtonProps = ComponentProps<"button"> & {
  variant?: AdminFilterVariant;
};

export function AdminFilterButton({
  variant = "default",
  type = "button",
  className,
  children,
  ...props
}: AdminFilterButtonProps) {
  return (
    <UnifiedButton {...props} type={type} className={cn(BUTTON_CLASS_MAP[variant], className)}>
      {children}
    </UnifiedButton>
  );
}
