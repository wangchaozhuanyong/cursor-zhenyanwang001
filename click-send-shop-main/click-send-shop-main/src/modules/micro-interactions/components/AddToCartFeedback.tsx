import { useEffect, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { LoadingButton, type LoadingButtonState } from "./LoadingButton";

type AddToCartFeedbackProps = {
  onAdd: () => void | Promise<void>;
  className?: string;
  idleLabel?: string;
  successLabel?: string;
  toastMessage?: string;
  variant?: "solid" | "outline" | "gold";
};

export function AddToCartFeedback({
  onAdd,
  className,
  idleLabel = "加入购物车",
  successLabel = "已加入",
  toastMessage = "已加入购物车",
  variant = "outline",
}: AddToCartFeedbackProps) {
  const [state, setState] = useState<LoadingButtonState>("normal");

  useEffect(() => {
    if (state !== "success") return;
    const t = window.setTimeout(() => setState("normal"), 1600);
    return () => window.clearTimeout(t);
  }, [state]);

  const handleClick = async () => {
    if (state === "loading") return;
    setState("loading");
    try {
      await onAdd();
      setState("success");
      toast.success(toastMessage);
      window.dispatchEvent(new CustomEvent("cart:badge-bump"));
    } catch {
      setState("error");
      window.setTimeout(() => setState("normal"), 1200);
    }
  };

  return (
    <LoadingButton
      variant={variant}
      state={state}
      className={cn("flex-1", className)}
      onClick={() => void handleClick()}
      loadingText="加入中..."
      successText={successLabel}
      errorText="失败"
    >
      {idleLabel}
    </LoadingButton>
  );
}

export default AddToCartFeedback;
