import { get, post } from "@/api/request";

export interface WechatLoginBinding {
  bound: boolean;
  nickname?: string | null;
  avatarUrl?: string | null;
  boundAt?: string;
  wechatLoginEnabled?: boolean;
}

export function getWechatBinding() {
  return get<WechatLoginBinding>("/me/wechat-binding");
}

export function bindWechat(redirect?: string) {
  return post<{ authorizeUrl: string }>("/me/bind-wechat", redirect ? { redirect } : {});
}

export function unbindWechat() {
  return post<void>("/me/unbind-wechat");
}

export type MeSummaryResponse = {
  profile: import("@/types/user").UserProfile | null;
  orderSummary: import("@/types/order").OrderSummary | null;
  couponCount: number;
  favoriteCount: number;
  unreadCount: number;
  inviteStats: import("@/types/invite").InviteStats | null;
  rewardBalance: { balance: number; pendingAmount: number };
  loyaltyConfig: import("@/services/loyaltyService").LoyaltyConfig | null;
};

export function getMeSummary() {
  return get<MeSummaryResponse>("/me/summary");
}
