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
}

export interface UpdateProfileParams {
  nickname?: string;
  avatar?: string;
  phone?: string;
  wechat?: string;
  whatsapp?: string;
}
