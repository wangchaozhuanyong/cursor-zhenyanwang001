import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Download, X } from "lucide-react";
import {
  registerDownloadConfirmDialog,
  type DownloadConfirmRequest,
} from "@/utils/downloadConfirm";
import "@/styles/fixed-storefront-overlays.css";

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
          className="sf-fixed-download-confirm"
          role="presentation"
          onClick={() => close(false)}
        >
          <section
            aria-modal="true"
            aria-labelledby="download-confirm-title"
            aria-describedby={pending.description ? "download-confirm-description" : undefined}
            className="sf-fixed-download-confirm__panel"
            role="dialog"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sf-fixed-download-confirm__header">
              <span className="sf-fixed-download-confirm__icon" aria-hidden>
                <Download size={20} />
              </span>
              <div className="sf-fixed-download-confirm__copy">
                <h2 id="download-confirm-title">
                  {pending.title ?? "\u786e\u8ba4\u4e0b\u8f7d"}
                </h2>
                {pending.description ? (
                  <p id="download-confirm-description">{pending.description}</p>
                ) : null}
              </div>
            </div>
            <div className="sf-fixed-download-confirm__actions">
              <button
                type="button"
                className="sf-fixed-overlay-action"
                onClick={() => close(false)}
              >
                <X className="h-4 w-4 shrink-0" aria-hidden />
                <span>{pending.cancelText ?? "\u53d6\u6d88"}</span>
              </button>
              <button
                type="button"
                className="sf-fixed-overlay-action is-primary"
                onClick={() => close(true)}
                autoFocus
              >
                <Download className="h-4 w-4 shrink-0" aria-hidden />
                <span>{pending.confirmText ?? "\u4e0b\u8f7d"}</span>
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
