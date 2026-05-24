import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatedConfirmDialog } from "@/modules/micro-interactions";
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

  const close = (accepted: boolean) => {
    const current = pendingRef.current;
    pendingRef.current = null;
    setPending(null);
    current?.resolve(accepted);
  };

  return (
    <>
      {children}
      <AnimatedConfirmDialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) close(false);
        }}
        title={pending?.title ?? "确认下载"}
        description={pending?.description}
        confirmText={pending?.confirmText ?? "下载"}
        cancelText={pending?.cancelText ?? "取消"}
        onConfirm={async () => {
          close(true);
        }}
      />
    </>
  );
}
