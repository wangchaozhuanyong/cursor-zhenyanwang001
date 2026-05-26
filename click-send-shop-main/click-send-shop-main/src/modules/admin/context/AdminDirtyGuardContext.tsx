import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { AnimatedConfirmDialog } from "@/modules/micro-interactions";
import { useAdminT } from "@/hooks/useAdminT";

export type AdminDirtyTabRef = { id: string; title: string };

type AdminDirtyGuardContextValue = {
  setTabDirty: (tabId: string, dirty: boolean) => void;
  isTabDirty: (tabId: string) => boolean;
  confirmDiscardTab: (tabId: string, tabTitle: string) => Promise<boolean>;
  confirmDiscardTabs: (tabs: AdminDirtyTabRef[]) => Promise<boolean>;
};

const AdminDirtyGuardContext = createContext<AdminDirtyGuardContextValue | null>(null);

type DiscardPrompt = {
  mode: "single" | "batch";
  tabId?: string;
  tabTitle?: string;
  tabTitles?: string[];
  resolve: (proceed: boolean) => void;
};

export function AdminDirtyGuardProvider({ children }: { children: ReactNode }) {
  const { tText } = useAdminT();
  const [dirtyByTab, setDirtyByTab] = useState<Record<string, boolean>>({});
  const [discardPrompt, setDiscardPrompt] = useState<DiscardPrompt | null>(null);

  const setTabDirty = useCallback((tabId: string, dirty: boolean) => {
    setDirtyByTab((prev) => {
      if (!dirty) {
        if (!prev[tabId]) return prev;
        const next = { ...prev };
        delete next[tabId];
        return next;
      }
      if (prev[tabId]) return prev;
      return { ...prev, [tabId]: true };
    });
  }, []);

  const isTabDirty = useCallback((tabId: string) => Boolean(dirtyByTab[tabId]), [dirtyByTab]);

  const confirmDiscardTab = useCallback(
    (tabId: string, tabTitle: string) => {
      if (!dirtyByTab[tabId]) return Promise.resolve(true);
      return new Promise<boolean>((resolve) => {
        setDiscardPrompt({ mode: "single", tabId, tabTitle, resolve });
      });
    },
    [dirtyByTab],
  );

  const confirmDiscardTabs = useCallback(
    (tabs: AdminDirtyTabRef[]) => {
      const dirtyTabs = tabs.filter((tab) => dirtyByTab[tab.id]);
      if (dirtyTabs.length === 0) return Promise.resolve(true);
      return new Promise<boolean>((resolve) => {
        setDiscardPrompt({
          mode: "batch",
          tabTitles: dirtyTabs.map((tab) => tab.title),
          resolve,
        });
      });
    },
    [dirtyByTab],
  );

  const value = useMemo(
    () => ({ setTabDirty, isTabDirty, confirmDiscardTab, confirmDiscardTabs }),
    [confirmDiscardTab, confirmDiscardTabs, isTabDirty, setTabDirty],
  );

  return (
    <AdminDirtyGuardContext.Provider value={value}>
      {children}
      <AnimatedConfirmDialog
        open={discardPrompt !== null}
        onOpenChange={(open) => {
          if (!open) {
            discardPrompt?.resolve(false);
            setDiscardPrompt(null);
          }
        }}
        danger
        title={tText("未保存的更改")}
        description={
          discardPrompt?.mode === "batch" && discardPrompt.tabTitles?.length
            ? tText(
                `以下 ${discardPrompt.tabTitles.length} 个标签页有未保存修改：${discardPrompt.tabTitles.join("、")}。关闭后修改将丢失。`,
              )
            : discardPrompt?.tabTitle
              ? tText(`「${discardPrompt.tabTitle}」有未保存的修改，关闭标签后修改将丢失。`)
              : undefined
        }
        confirmText={tText("仍要关闭")}
        cancelText={tText("继续编辑")}
        onConfirm={() => {
          discardPrompt?.resolve(true);
          setDiscardPrompt(null);
        }}
      />
    </AdminDirtyGuardContext.Provider>
  );
}

export function useAdminDirtyGuard() {
  const ctx = useContext(AdminDirtyGuardContext);
  if (!ctx) {
    throw new Error("useAdminDirtyGuard must be used within AdminDirtyGuardProvider");
  }
  return ctx;
}

export function useAdminDirtyGuardOptional() {
  return useContext(AdminDirtyGuardContext);
}
