import { create } from "zustand";
import { persist } from "zustand/middleware";
import * as authService from "@/services/authService";
import * as userService from "@/services/userService";
import * as addressService from "@/services/addressService";
import { isLoggedIn } from "@/utils/token";
import type { Address } from "@/types/address";

export type { Address };

interface UserState {
  nickname: string;
  avatar: string;
  phone: string;
  wechat: string;
  whatsapp: string;
  inviteCode: string;
  parentInviteCode: string;
  pointsBalance: number;
  addresses: Address[];
  addressLoading: boolean;
  subordinateEnabled: boolean;
  profileLoading: boolean;
  profileSaving: boolean;

  loadProfile: () => Promise<void>;
  saveProfile: () => Promise<void>;
  clearProfile: () => void;

  loadAddresses: () => Promise<void>;
  addAddress: (a: Omit<Address, "id">) => Promise<void>;
  updateAddress: (id: string, a: Partial<Address>) => Promise<void>;
  removeAddress: (id: string) => Promise<void>;
  setDefaultAddress: (id: string) => Promise<void>;
  getDefaultAddress: () => Address | undefined;

  setNickname: (n: string) => void;
  setAvatar: (a: string) => void;
  setPhone: (p: string) => void;
  setWechat: (w: string) => void;
  setWhatsapp: (w: string) => void;
  setParentInviteCode: (c: string) => void;
  setSubordinateEnabled: (v: boolean) => void;
  addPoints: (pts: number) => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      nickname: "用户",
      avatar: "",
      phone: "",
      wechat: "",
      whatsapp: "",
      inviteCode: "",
      parentInviteCode: "",
      pointsBalance: 0,
      addresses: [],
      addressLoading: false,
      subordinateEnabled: false,
      profileLoading: false,
      profileSaving: false,

      loadProfile: async () => {
        set({ profileLoading: true });
        try {
          const profile = await authService.getProfile();
          set({
            nickname: profile.nickname || "用户",
            avatar: profile.avatar || "",
            phone: profile.phone || "",
            wechat: profile.wechat || "",
            whatsapp: profile.whatsapp || "",
            inviteCode: profile.inviteCode || "",
            parentInviteCode: profile.parentInviteCode || "",
            pointsBalance: profile.pointsBalance ?? 0,
            subordinateEnabled: profile.subordinateEnabled ?? false,
            profileLoading: false,
          });
        } catch {
          set({ profileLoading: false });
        }
      },

      saveProfile: async () => {
        const s = get();
        set({ profileSaving: true });
        try {
          await userService.updateProfile({
            nickname: s.nickname,
            avatar: s.avatar,
            phone: s.phone,
            wechat: s.wechat,
            whatsapp: s.whatsapp,
          });
        } finally {
          set({ profileSaving: false });
        }
      },

      clearProfile: () =>
        set({
          nickname: "用户",
          avatar: "",
          phone: "",
          wechat: "",
          whatsapp: "",
          inviteCode: "",
          parentInviteCode: "",
          pointsBalance: 0,
          addresses: [],
          subordinateEnabled: false,
        }),

      setNickname: (nickname) => set({ nickname }),
      setAvatar: (avatar) => set({ avatar }),
      setPhone: (phone) => set({ phone }),
      setWechat: (wechat) => set({ wechat }),
      setWhatsapp: (whatsapp) => set({ whatsapp }),
      setParentInviteCode: (parentInviteCode) => set({ parentInviteCode }),
      setSubordinateEnabled: (subordinateEnabled) => set({ subordinateEnabled }),
      addPoints: (pts) => set((s) => ({ pointsBalance: s.pointsBalance + pts })),

      loadAddresses: async () => {
        if (!isLoggedIn()) return;
        set({ addressLoading: true });
        try {
          const list = await addressService.fetchAddresses();
          set({ addresses: list, addressLoading: false });
        } catch {
          set({ addressLoading: false });
        }
      },

      addAddress: async (a) => {
        const addr = await addressService.createAddress(a);
        set((s) => ({
          addresses: addr.isDefault
            ? [...s.addresses.map((x) => ({ ...x, isDefault: false })), addr]
            : [...s.addresses, addr],
        }));
      },

      updateAddress: async (id, a) => {
        const addr = await addressService.updateAddress(id, a);
        set((s) => ({
          addresses: addr.isDefault
            ? s.addresses.map((x) => (x.id === id ? addr : { ...x, isDefault: false }))
            : s.addresses.map((x) => (x.id === id ? addr : x)),
        }));
      },

      removeAddress: async (id) => {
        await addressService.deleteAddress(id);
        set((s) => {
          const filtered = s.addresses.filter((x) => x.id !== id);
          return { addresses: filtered };
        });
        get().loadAddresses();
      },

      setDefaultAddress: async (id) => {
        const beforeSnapshot = get().addresses;
        set((s) => ({
          addresses: s.addresses.map((x) => ({ ...x, isDefault: x.id === id })),
        }));
        try {
          await addressService.setDefault(id);
        } catch (error) {
          set({ addresses: beforeSnapshot });
          throw error;
        }
      },

      getDefaultAddress: () => get().addresses.find((a) => a.isDefault),
    }),
    {
      name: "user-storage",
      partialize: (s) => ({
        nickname: s.nickname,
        avatar: s.avatar,
        phone: s.phone,
        wechat: s.wechat,
        whatsapp: s.whatsapp,
        inviteCode: s.inviteCode,
        parentInviteCode: s.parentInviteCode,
        pointsBalance: s.pointsBalance,
        addresses: s.addresses,
        subordinateEnabled: s.subordinateEnabled,
      }),
    },
  ),
);
