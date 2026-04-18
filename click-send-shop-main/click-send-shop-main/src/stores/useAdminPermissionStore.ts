import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AdminPermissionState {
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
    },
  ),
);
