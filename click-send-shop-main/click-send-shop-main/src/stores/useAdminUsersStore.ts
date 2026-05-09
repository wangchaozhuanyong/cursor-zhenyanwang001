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
  subordinate_enabled?: boolean | number;
  created_at?: string;
}

const initialState = {
  users: [] as AdminUserListItem[],
  total: 0,
  page: 1,
  pageSize: 20,
  loading: true,
  search: "",
};

interface AdminUsersState {
  users: AdminUserListItem[];
  total: number;
  page: number;
  pageSize: number;
  loading: boolean;
  search: string;
  setSearch: (v: string) => void;
  setPage: (v: number) => void;
  setPageSize: (v: number) => void;
  loadUsers: (params?: { page?: number; pageSize?: number; keyword?: string }) => Promise<void>;
  reset: () => void;
}

export const useAdminUsersStore = create<AdminUsersState>((set) => ({
  ...initialState,

  setSearch: (search) => set({ search }),
  setPage: (page) => set({ page }),
  setPageSize: (pageSize) => set({ pageSize }),

  reset: () => set({ ...initialState }),

  loadUsers: async (params = {}) => {
    set({ loading: true });
    try {
      const state = useAdminUsersStore.getState();
      const page = params.page ?? state.page;
      const pageSize = params.pageSize ?? state.pageSize;
      const keyword = params.keyword ?? state.search;
      const p = await userService.fetchUsers({ page, pageSize, keyword: keyword || undefined });
      set({
        users: p.list as AdminUserListItem[],
        total: p.total,
        page: p.page,
        pageSize: p.pageSize,
        loading: false,
      });
    } catch {
      set({ loading: false });
      throw new Error("LOAD_ADMIN_USERS_FAILED");
    }
  },
}));
