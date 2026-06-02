import type { ButtonHTMLAttributes, PropsWithChildren } from "react";
import { cn } from "@/lib/utils";
import { useThemeRuntime } from "@/contexts/ThemeRuntimeProvider";
import { UnifiedButton } from "./UnifiedButton";

type StoreButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "price";
type StoreButtonSize = "sm" | "md" | "lg";

interface StoreButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: StoreButtonVariant;
  size?: StoreButtonSize;
}

const variantMap: Record<StoreButtonVariant, string> = {
  primary: "bg-[var(--theme-primary)] text-[var(--theme-primary-foreground)] border border-transparent",
  secondary: "bg-[var(--theme-secondary)] text-[var(--theme-secondary-foreground)] border border-transparent",
  ghost: "bg-transparent text-[var(--theme-text)] border border-[var(--theme-border)]",
  danger: "bg-[var(--theme-danger)] text-[var(--theme-danger-foreground)] border border-transparent",
  price: "bg-[var(--theme-price)] text-[var(--theme-price-foreground)] border border-transparent",
};

const sizeMap: Record<StoreButtonSize, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-5 text-sm font-semibold",
};

export default function StoreButton({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: PropsWithChildren<StoreButtonProps>) {
  const { themeConfig } = useThemeRuntime();
  const radiusClass =
    themeConfig.buttonStyle === "pill"
      ? "rounded-full"
      : themeConfig.buttonStyle === "square"
        ? "rounded-md"
        : "";

  return (
    <UnifiedButton
      type="button"
      className={cn(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap transition-[transform,box-shadow,filter,background-color,border-color,color] duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--theme-bg)]",
        "hover:brightness-[1.02]",
        variantMap[variant],
        sizeMap[size],
        radiusClass,
        className,
      )}
      style={themeConfig.buttonStyle === "rounded" ? { borderRadius: "var(--theme-radius)" } : undefined}
      {...props}
    >
      {children}
    </UnifiedButton>
  );
}
