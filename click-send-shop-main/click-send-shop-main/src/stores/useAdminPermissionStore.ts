import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AdminPermissionState {
  hydrated: boolean;
  permissions: string[];
  isSuperAdmin: boolean;
  setAccess: (payload: { permissions: string[]; isSuperAdmin: boolean }) => void;
  clear: () => void;
  can: (code: string) => boolean;
  canAny: (codes: string[]) => boolean;
}

export const useAdminPermissionStore = create<AdminPermissionState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      permissions: [],
      isSuperAdmin: false,
      setAccess: (payload) =>
        set({
          permissions: payload.permissions ?? [],
          isSuperAdmin: !!payload.isSuperAdmin,
        }),
      clear: () => set({ permissions: [], isSuperAdmin: false }),
      can: (code) => {
        const { isSuperAdmin, permissions } = get();
        if (isSuperAdmin) return true;
        return permissions.includes(code);
      },
      canAny: (codes) => codes.some((c) => get().can(c)),
    }),
    {
      name: "admin-permissions",
      partialize: (s) => ({ permissions: s.permissions, isSuperAdmin: s.isSuperAdmin }),
      onRehydrateStorage: () => (state, _error) => {
        // persist 完成后标记水合，避免权限为空时误触发重定向
        if (state) {
          useAdminPermissionStore.setState({ hydrated: true });
        } else {
          useAdminPermissionStore.setState({ hydrated: true });
        }
      },
    },
  ),
);
