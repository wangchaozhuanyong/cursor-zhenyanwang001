export interface MemberLevel {
  id: string;
  name: string;
  description?: string;
  min_spent?: number;
  min_orders?: number;
  discount_rate?: number;
  points_multiplier?: number;
  free_shipping_enabled?: boolean;
  sort_order?: number;
  enabled?: boolean;
  is_default?: boolean;
}

export interface WechatLoginBinding {
  bound: boolean;
  nickname?: string | null;
  avatarUrl?: string | null;
  boundAt?: string;
}

export interface UserProfile {
  id: string;
  nickname: string;
  avatar: string;
  phone: string;
  wechat: string;
  whatsapp: string;
  birthday?: string | null;
  birthday_locked?: boolean | number;
  birthdayLocked?: boolean;
  wechatLogin?: WechatLoginBinding;
  wechat_auth?: {
    bound: boolean;
    nickname?: string | null;
    avatar_url?: string | null;
    bound_at?: string | null;
  };
  inviteCode: string;
  parentInviteCode: string;
  pointsBalance: number;
  subordinateEnabled: boolean;
  memberLevel?: MemberLevel | null;
  tags?: UserTag[];
  created_at?: string;
  invite_code?: string;
  parent_invite_code?: string;
  points_balance?: number;
  subordinate_enabled?: boolean | number;
  member_level_id?: string;
  member_level_name?: string;
  member_level_description?: string;
  member_level_min_spent?: number;
  member_level_min_orders?: number;
  member_level_manual_locked?: boolean | number;
  member_level_manual_reason?: string | null;
  member_level_manual_at?: string | null;
  account_status?: string;
  order_restricted?: boolean | number;
  coupon_restricted?: boolean | number;
  comment_restricted?: boolean | number;
  status_overview?: {
    account_status: string;
    restrictions: {
      order_restricted: boolean;
      coupon_restricted: boolean;
      comment_restricted: boolean;
    };
    latest_status_action: {
      operator_id?: string | null;
      operator_name?: string;
      summary?: string;
      created_at?: string | null;
    } | null;
  };
  related?: Record<string, unknown>;
  operation_logs?: Record<string, unknown>[];
}

export type UserStatusOverview = NonNullable<UserProfile["status_overview"]>;

export type UserEditForm = Partial<Pick<UserProfile, "nickname" | "phone" | "wechat" | "whatsapp" | "avatar" | "birthday" | "birthday_locked">>;

export interface UserTag {
  id: string;
  name: string;
  color?: string;
  description?: string;
  sort_order?: number;
  count?: number;
}

export interface UpdateProfileParams {
  nickname?: string;
  avatar?: string;
  phone?: string;
  countryCode?: string;
  wechat?: string;
  whatsapp?: string;
  whatsappCountryCode?: string;
  birthday?: string | null;
}
