export interface InviteRecord {
  id: string;
  inviter_id: string;
  invitee_id: string;
  invitee_nickname: string;
  invitee_avatar: string;
  invite_code: string;
  status: "registered" | "ordered";
  reward_amount: number;
  created_at: string;
}

export interface InviteStats {
  totalInvited: number;
  totalReward: number;
  directCount: number;
  indirectCount: number;
  totalOrderAmount: number;
}

export interface ReferralRule {
  id: string;
  level: number;
  commission_rate: number;
  description: string;
  enabled: boolean;
}
