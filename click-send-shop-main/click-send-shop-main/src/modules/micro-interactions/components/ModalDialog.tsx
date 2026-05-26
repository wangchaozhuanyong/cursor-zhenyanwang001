import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useEffect, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";
import { useModalLayer } from "../modal/ModalLayerProvider";

export type ModalDialogProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  closeOnOverlay?: boolean;
  showCloseButton?: boolean;
  hasTitle?: boolean;
  hasDescription?: boolean;
};

/** 居中 Dialog，接入全局弹层 z-index 栈，仅栈顶响应 Escape */
export function ModalDialog({
  open,
  onClose,
  children,
  className,
  closeOnOverlay = true,
  showCloseButton = true,
  hasTitle = true,
  hasDescription = true,
}: ModalDialogProps) {
  const { overlayZ, contentZ, isTop } = useModalLayer(open);
  useBodyScrollLock(open);
  const contentAccessibilityProps = {
    ...(hasTitle ? {} : { "aria-labelledby": undefined }),
    ...(hasDescription ? {} : { "aria-describedby": undefined }),
  };

  useEffect(() => {
    if (!open || !isTop) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, isTop, onClose]);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className="fixed inset-0 bg-black/45 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          style={{ zIndex: overlayZ }}
          onClick={closeOnOverlay ? onClose : undefined}
        />
        <DialogPrimitive.Content
          className={cn(
            "fixed left-1/2 top-1/2 grid w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 overflow-hidden rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-0 text-[var(--theme-text)] shadow-[var(--theme-shadow-hover)] duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            className,
          )}
          style={{ zIndex: contentZ }}
          {...contentAccessibilityProps}
          onPointerDownOutside={(e) => {
            if (!closeOnOverlay) e.preventDefault();
          }}
          onInteractOutside={(e) => {
            if (!closeOnOverlay) e.preventDefault();
          }}
        >
          {children}
          {showCloseButton ? (
            <DialogPrimitive.Close
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-[var(--theme-border)] text-[var(--theme-text-muted)] transition hover:bg-[var(--theme-bg)]"
              aria-label="关闭"
            >
              <X size={18} />
            </DialogPrimitive.Close>
          ) : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export function ModalDialogHeader({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return <div className={cn("space-y-1 px-5 py-4 text-left", className)} {...props} />;
}

export function ModalDialogTitle({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn("text-base font-semibold text-[var(--theme-text)]", className)}
      {...props}
    />
  );
}

export function ModalDialogDescription({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cn("text-sm text-[var(--theme-text-muted)]", className)}
      {...props}
    />
  );
}
