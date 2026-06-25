import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type ClientButtonVariant = "primary" | "secondary" | "ghost" | "text" | "danger";
export type ClientButtonSize = "sm" | "md" | "lg" | "xl";

export type ClientButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ClientButtonVariant;
  size?: ClientButtonSize;
  loading?: boolean;
  icon?: ReactNode;
};

const ClientButton = forwardRef<HTMLButtonElement, ClientButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      disabled,
      icon,
      className,
      children,
      type = "button",
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          "sf-next-button",
          `sf-next-button--${variant}`,
          `sf-next-button--${size}`,
          loading && "is-loading",
          className,
        )}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading ? <LoaderCircle size={16} className="sf-next-button__spinner" aria-hidden /> : icon}
        {children ? <span className="sf-next-button__label">{children}</span> : null}
      </button>
    );
  },
);

ClientButton.displayName = "ClientButton";

export default ClientButton;
