import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useOverlayDismiss } from "@/modules/micro-interactions/hooks/useOverlayDismiss";
import { useModalLayer } from "@/modules/micro-interactions/modal/ModalLayerProvider";

export type AdminSideDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  bodyClassName?: string;
  closeOnOverlay?: boolean;
  showCloseButton?: boolean;
};

export function AdminSideDrawer({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
  bodyClassName,
  closeOnOverlay = false,
  showCloseButton = true,
}: AdminSideDrawerProps) {
  const { overlayZ, contentZ, isTop } = useModalLayer(open);
  useOverlayDismiss({ open, isTop, onClose: () => onOpenChange(false), lockBody: true });

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(nextOpen) => !nextOpen && onOpenChange(false)}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className="fixed inset-0 bg-black/45 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:pointer-events-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          style={{ zIndex: overlayZ }}
          onClick={closeOnOverlay ? () => onOpenChange(false) : undefined}
        />
        <DialogPrimitive.Content
          className={cn(
            "admin-side-drawer fixed inset-y-0 right-0 flex w-full max-w-full flex-col overflow-hidden border-l border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text)] shadow-[var(--theme-shadow-hover)] duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:w-[92vw] lg:w-[min(76vw,1080px)] xl:w-[min(70vw,1120px)]",
            className,
          )}
          style={{ zIndex: contentZ }}
          {...(description ? {} : { "aria-describedby": undefined })}
          onPointerDownOutside={(e) => {
            if (!closeOnOverlay) e.preventDefault();
          }}
          onInteractOutside={(e) => {
            if (!closeOnOverlay) e.preventDefault();
          }}
        >
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="admin-side-drawer-header safe-area-pt flex shrink-0 items-start justify-between gap-3 border-b border-[var(--theme-border)] px-4 py-3 sm:px-5 sm:py-4">
              <div className="min-w-0 flex-1">
                <DialogPrimitive.Title className="truncate text-base font-semibold text-[var(--theme-text)]">
                  {title}
                </DialogPrimitive.Title>
                {description ? (
                  <DialogPrimitive.Description className="mt-1 text-xs text-[var(--theme-text-muted)]">
                    {description}
                  </DialogPrimitive.Description>
                ) : null}
              </div>
              {showCloseButton ? (
                <DialogPrimitive.Close
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--theme-border)] text-[var(--theme-text-muted)] transition hover:bg-[var(--theme-bg)]"
                  aria-label="关闭"
                >
                  <X size={18} />
                </DialogPrimitive.Close>
              ) : null}
            </div>
            <div className={cn("admin-side-drawer-body min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 sm:px-5 sm:py-4", bodyClassName)}>
              {children}
            </div>
            {footer ? (
              <div className="admin-side-drawer-footer safe-area-pb shrink-0 border-t border-[var(--theme-border)] px-4 py-3 sm:px-5">{footer}</div>
            ) : null}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
