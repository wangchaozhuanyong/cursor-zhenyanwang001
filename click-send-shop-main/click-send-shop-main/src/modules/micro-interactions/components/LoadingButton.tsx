import type { ReactNode } from "react";
import { AlertCircle, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { SquishButton, type SquishButtonVariant } from "./SquishButton";

export type LoadingButtonState = "normal" | "loading" | "success" | "error" | "disabled";

export type LoadingButtonProps = {
  state?: LoadingButtonState;
  children: ReactNode;
  leftIcon?: ReactNode;
  loadingText?: string;
  successText?: string;
  errorText?: string;
  variant?: SquishButtonVariant;
  className?: string;
  type?: "button" | "submit";
  onClick?: () => void;
  disabled?: boolean;
};

const variantClass: Record<SquishButtonVariant, string> = {
  solid: "squish-solid-cta",
  outline: "squish-outline-cta",
  price: "squish-price-cta",
  gold: "squish-gold-cta",
  ghost: "squish-ghost",
};

export function LoadingButton({
  state = "normal",
  children,
  leftIcon,
  loadingText,
  successText,
  errorText,
  variant = "solid",
  className,
  type = "button",
  onClick,
  disabled,
}: LoadingButtonProps) {
  const isDisabled = disabled || state === "loading" || state === "disabled";
  const showSuccess = state === "success";
  const showError = state === "error";
  const showLoading = state === "loading";

  const label = showLoading
    ? (loadingText ?? children)
    : showSuccess
      ? (successText ?? children)
      : showError
        ? (errorText ?? children)
        : children;

  return (
    <SquishButton
      type={type}
      variant={variant}
      disabled={isDisabled}
      onClick={onClick}
      aria-busy={showLoading}
      className={cn(
        "gap-2",
        showError && "bg-[var(--theme-danger)] text-[var(--theme-danger-foreground)]",
        showSuccess && "bg-[var(--theme-success)] text-[var(--theme-success-foreground)]",
        variantClass[variant],
        className,
      )}
      style={
        showError || showSuccess
          ? undefined
          : undefined
      }
    >
      {showLoading ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden /> : null}
      {showSuccess ? <Check className="h-4 w-4 shrink-0" aria-hidden /> : null}
      {showError ? <AlertCircle className="h-4 w-4 shrink-0" aria-hidden /> : null}
      {!showLoading && !showSuccess && !showError ? leftIcon : null}
      <span>{label}</span>
    </SquishButton>
  );
}

export default LoadingButton;
