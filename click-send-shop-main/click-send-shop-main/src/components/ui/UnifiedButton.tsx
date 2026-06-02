import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type UnifiedButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

const UnifiedButton = forwardRef<HTMLButtonElement, UnifiedButtonProps>(
  ({ className, type = "button", ...props }, ref) => (
    <button ref={ref} type={type} className={cn("app-unified-button", className)} {...props} />
  ),
);

UnifiedButton.displayName = "UnifiedButton";

export { UnifiedButton };
export default UnifiedButton;
