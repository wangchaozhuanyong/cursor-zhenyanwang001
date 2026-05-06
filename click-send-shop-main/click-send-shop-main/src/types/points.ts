export type PointsAction =
  | "order"
  | "order_earn"
  | "order_reverse"
  | "refund"
  | "sign_in"
  | "invite_reward"
  | "admin_add"
  | "admin_deduct"
  | "admin_adjust"
  | "redeem";

export interface PointsRecord {
  id: string;
  user_id: string;
  order_id?: string;
  order_no?: string;
  action: PointsAction;
  amount: number;
  balance_before?: number;
  balance_after?: number;
  description: string;
  source_type?: string;
  status?: string;
  created_at: string;
  user_phone?: string;
  user_nickname?: string;
}

export interface PointsStats {
  totalEarned: number;
  totalDeducted: number;
  totalRecords: number;
  activeUsers: number;
}

export interface AdminPointsRecordsResponse {
  list: PointsRecord[];
  total: number;
  page: number;
  pageSize: number;
  stats: PointsStats;
}

export interface PointsRule {
  id: string;
  name: string;
  description: string;
  points_per_yuan: number;
  sign_in_points: number;
  enabled: boolean;
}

export interface PointsListParams {
  action?: PointsAction;
  keyword?: string;
  userId?: string;
  page?: number;
  pageSize?: number;
}
