import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { AnimatedConfirmDialog } from "@/modules/micro-interactions";

export type AdminConfirmOptions = {
  title: string;
  description?: ReactNode;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  onConfirm: () => void | Promise<void>;
};

type AdminConfirmContextValue = {
  confirm: (options: AdminConfirmOptions) => void;
  confirmAsync: (options: Omit<AdminConfirmOptions, "onConfirm">) => Promise<boolean>;
};

const AdminConfirmContext = createContext<AdminConfirmContextValue | null>(null);

export function AdminConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<AdminConfirmOptions | null>(null);
  const [pendingResolve, setPendingResolve] = useState<((confirmed: boolean) => void) | null>(null);

  const confirm = useCallback((options: AdminConfirmOptions) => {
    setPending(options);
    setPendingResolve(null);
  }, []);

  const confirmAsync = useCallback((options: Omit<AdminConfirmOptions, "onConfirm">) => {
    return new Promise<boolean>((resolve) => {
      setPending({
        ...options,
        onConfirm: () => resolve(true),
      });
      setPendingResolve(() => resolve);
    });
  }, []);

  const closePending = useCallback((confirmed: boolean) => {
    pendingResolve?.(confirmed);
    setPending(null);
    setPendingResolve(null);
  }, [pendingResolve]);

  return (
    <AdminConfirmContext.Provider value={{ confirm, confirmAsync }}>
      {children}
      <AnimatedConfirmDialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) closePending(false);
        }}
        title={pending?.title ?? ""}
        description={pending?.description}
        confirmText={pending?.confirmText ?? "确认"}
        cancelText={pending?.cancelText ?? "取消"}
        danger={pending?.danger}
        onConfirm={async () => {
          if (!pending) return;
          await pending.onConfirm();
          closePending(true);
        }}
      />
    </AdminConfirmContext.Provider>
  );
}

export function useAdminConfirm() {
  const ctx = useContext(AdminConfirmContext);
  if (!ctx) {
    throw new Error("useAdminConfirm must be used within AdminConfirmProvider");
  }
  return ctx;
}

/** 删除类操作 */
export function adminConfirmDelete(
  confirm: AdminConfirmContextValue["confirm"],
  target: string,
  onConfirm: () => void | Promise<void>,
  extra?: Partial<Pick<AdminConfirmOptions, "description" | "confirmText">>,
) {
  confirm({
    title: "确认删除",
    description: extra?.description ?? `确定删除「${target}」？此操作可能无法撤销。`,
    confirmText: extra?.confirmText ?? "删除",
    danger: true,
    onConfirm,
  });
}

/** 保存类操作 */
export function adminConfirmSave(
  confirm: AdminConfirmContextValue["confirm"],
  label: string,
  onConfirm: () => void | Promise<void>,
) {
  confirm({
    title: "确认保存",
    description: `确定保存${label}？`,
    confirmText: "保存",
    onConfirm,
  });
}
