import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import AdminAccountSettingsDialog from "@/components/admin/AdminAccountSettingsDialog";
import type { AdminAccountTab } from "@/components/admin/AdminAccountPanel";

type AdminAccountSettingsContextValue = {
  openAccountSettings: (tab?: AdminAccountTab) => void;
};

const AdminAccountSettingsContext = createContext<AdminAccountSettingsContextValue | null>(null);

export function AdminAccountSettingsProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [initialTab, setInitialTab] = useState<AdminAccountTab>("profile");

  const openAccountSettings = useCallback((tab: AdminAccountTab = "profile") => {
    setInitialTab(tab);
    setOpen(true);
  }, []);

  return (
    <AdminAccountSettingsContext.Provider value={{ openAccountSettings }}>
      {children}
      <AdminAccountSettingsDialog open={open} onOpenChange={setOpen} initialTab={initialTab} />
    </AdminAccountSettingsContext.Provider>
  );
}

export function useAdminAccountSettings() {
  const ctx = useContext(AdminAccountSettingsContext);
  if (!ctx) {
    throw new Error("useAdminAccountSettings must be used within AdminAccountSettingsProvider");
  }
  return ctx;
}
