import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  registerDownloadConfirmDialog,
  type DownloadConfirmRequest,
} from "@/utils/downloadConfirm";

type PendingConfirm = DownloadConfirmRequest & {
  resolve: (accepted: boolean) => void;
};

export function DownloadConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const pendingRef = useRef<PendingConfirm | null>(null);

  useEffect(() => {
    registerDownloadConfirmDialog((request) => new Promise<boolean>((resolve) => {
      const next: PendingConfirm = { ...request, resolve };
      pendingRef.current = next;
      setPending(next);
    }));
    return () => registerDownloadConfirmDialog(null);
  }, []);

  const close = useCallback((accepted: boolean) => {
    const current = pendingRef.current;
    pendingRef.current = null;
    setPending(null);
    current?.resolve(accepted);
  }, []);

  useEffect(() => {
    if (!pending) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [close, pending]);

  return (
    <>
      {children}
      {pending ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 px-4 py-6 backdrop-blur-sm"
          role="presentation"
          onClick={() => close(false)}
        >
          <div
            aria-modal="true"
            aria-labelledby="download-confirm-title"
            aria-describedby={pending.description ? "download-confirm-description" : undefined}
            className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-2xl"
            role="dialog"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="download-confirm-title" className="text-base font-semibold">
              {pending.title ?? "\u786e\u8ba4\u4e0b\u8f7d"}
            </h2>
            {pending.description ? (
              <p id="download-confirm-description" className="mt-2 text-sm leading-6 text-muted-foreground">
                {pending.description}
              </p>
            ) : null}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted"
                onClick={() => close(false)}
              >
                {pending.cancelText ?? "\u53d6\u6d88"}
              </button>
              <button
                type="button"
                className="rounded-lg bg-[var(--theme-primary)] px-4 py-2 text-sm font-semibold text-[var(--theme-primary-foreground)] shadow-sm transition hover:bg-[var(--theme-primary-hover,var(--theme-primary))]"
                onClick={() => close(true)}
              >
                {pending.confirmText ?? "\u4e0b\u8f7d"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
