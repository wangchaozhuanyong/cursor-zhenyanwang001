import { create } from "zustand";
import * as userService from "@/services/admin/userService";

/** 管理端用户列表行（与后端 JSON 字段一致，多为 snake_case） */
export interface AdminUserListItem {
  id: string;
  nickname?: string;
  phone?: string;
  avatar?: string;
  invite_code?: string;
  parent_invite_code?: string;
  points_balance?: number;
  created_at?: string;
}

const initialState = {
  users: [] as AdminUserListItem[],
  loading: true,
  search: "",
};

interface AdminUsersState {
  users: AdminUserListItem[];
  loading: boolean;
  search: string;
  setSearch: (v: string) => void;
  loadUsers: () => Promise<void>;
  reset: () => void;
}

export const useAdminUsersStore = create<AdminUsersState>((set) => ({
  ...initialState,

  setSearch: (search) => set({ search }),

  reset: () => set({ ...initialState }),

  loadUsers: async () => {
    set({ loading: true });
    try {
      const p = await userService.fetchUsers();
      set({ users: p.list as AdminUserListItem[], loading: false });
    } catch {
      set({ loading: false });
      throw new Error("LOAD_ADMIN_USERS_FAILED");
    }
  },
}));
