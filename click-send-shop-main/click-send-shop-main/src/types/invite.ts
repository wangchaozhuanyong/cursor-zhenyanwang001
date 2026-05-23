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
  name: string;
  rewardPercent: number;
  enabled: boolean;
}

/** 邀请记录列表汇总卡片 */
export interface InviteRecordsSummary {
  totalRecords?: number;
  inviterUsers?: number;
  inviteeUsers?: number;
}

/** 返现规则编辑行（表单本地状态） */
export interface ReferralRuleEditRow {
  id: string;
  level: number;
  name: string;
  rewardPercent: number;
  enabled: boolean;
}
