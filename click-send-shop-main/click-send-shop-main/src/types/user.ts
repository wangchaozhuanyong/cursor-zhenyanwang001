export interface MemberLevel {
  id: string;
  name: string;
  description?: string;
  min_spent?: number;
  min_orders?: number;
  sort_order?: number;
  enabled?: boolean;
  is_default?: boolean;
}

export interface UserProfile {
  id: string;
  nickname: string;
  avatar: string;
  phone: string;
  wechat: string;
  whatsapp: string;
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
  member_level_id?: string;
  member_level_name?: string;
  member_level_description?: string;
  member_level_min_spent?: number;
  member_level_min_orders?: number;
}

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
  wechat?: string;
  whatsapp?: string;
}

export interface UserDataExport {
  exported_at: string;
  scope: Record<string, string>;
  profile: Record<string, unknown>;
  addresses: Record<string, unknown>[];
  orders: Array<Record<string, unknown> & { items?: Record<string, unknown>[] }>;
  points_records: Record<string, unknown>[];
}
