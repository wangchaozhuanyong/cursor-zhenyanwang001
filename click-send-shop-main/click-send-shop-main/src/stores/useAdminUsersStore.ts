import { create } from "zustand";
import * as userService from "@/services/admin/userService";
import type { UserTag } from "@/types/user";

/** 管理端用户列表行（与后端 JSON 字段一致，多为 snake_case） */
export interface AdminUserListItem {
  id: string;
  nickname?: string;
  phone?: string;
  avatar?: string;
  invite_code?: string;
  parent_invite_code?: string;
  points_balance?: number;
  member_level_id?: string;
  member_level_name?: string;
  member_level_description?: string;
  member_level_min_spent?: number;
  member_level_min_orders?: number;
  subordinate_enabled?: boolean | number;
  created_at?: string;
  tags?: UserTag[];
}

const initialState = {
  users: [] as AdminUserListItem[],
  total: 0,
  page: 1,
  pageSize: 20,
  loading: true,
  search: "",
  selectedTagId: "",
  wechatBoundFilter: "",
  phoneBoundFilter: "",
  memberLevelIdFilter: "",
  accountStatusFilter: "",
  summary: {} as Record<string, number>,
};

interface AdminUsersState {
  users: AdminUserListItem[];
  total: number;
  page: number;
  pageSize: number;
  loading: boolean;
  search: string;
  selectedTagId: string;
  wechatBoundFilter: string;
  phoneBoundFilter: string;
  memberLevelIdFilter: string;
  accountStatusFilter: string;
  summary: Record<string, number>;
  setSearch: (v: string) => void;
  setSelectedTagId: (v: string) => void;
  setWechatBoundFilter: (v: string) => void;
  setPhoneBoundFilter: (v: string) => void;
  setMemberLevelIdFilter: (v: string) => void;
  setAccountStatusFilter: (v: string) => void;
  setPage: (v: number) => void;
  setPageSize: (v: number) => void;
  loadUsers: (params?: {
    page?: number;
    pageSize?: number;
    keyword?: string;
    tagId?: string;
    wechatBound?: string;
    phoneBound?: string;
    memberLevelId?: string;
    accountStatus?: string;
  }) => Promise<void>;
  reset: () => void;
}

export const useAdminUsersStore = create<AdminUsersState>((set) => ({
  ...initialState,

  setSearch: (search) => set({ search }),
  setSelectedTagId: (selectedTagId) => set({ selectedTagId }),
  setWechatBoundFilter: (wechatBoundFilter) => set({ wechatBoundFilter }),
  setPhoneBoundFilter: (phoneBoundFilter) => set({ phoneBoundFilter }),
  setMemberLevelIdFilter: (memberLevelIdFilter) => set({ memberLevelIdFilter }),
  setAccountStatusFilter: (accountStatusFilter) => set({ accountStatusFilter }),
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
      const tagId = params.tagId ?? state.selectedTagId;
      const wechatBound = params.wechatBound ?? state.wechatBoundFilter;
      const phoneBound = params.phoneBound ?? state.phoneBoundFilter;
      const memberLevelId = params.memberLevelId ?? state.memberLevelIdFilter;
      const accountStatus = params.accountStatus ?? state.accountStatusFilter;
      const p = await userService.fetchUsers({
        page,
        pageSize,
        keyword: keyword || undefined,
        tagId: tagId || undefined,
        wechatBound: wechatBound || undefined,
        phoneBound: phoneBound || undefined,
        memberLevelId: memberLevelId || undefined,
        accountStatus: accountStatus || undefined,
      });
      set({
        users: p.list as AdminUserListItem[],
        total: p.total,
        page: p.page,
        pageSize: p.pageSize,
        summary: p.summary || {},
        loading: false,
      });
    } catch {
      set({ loading: false });
      throw new Error("LOAD_ADMIN_USERS_FAILED");
    }
  },
}));
