export type PointsAction =
  | "order_earn"
  | "sign_in"
  | "invite_reward"
  | "admin_adjust"
  | "redeem";

export interface PointsRecord {
  id: string;
  user_id: string;
  action: PointsAction;
  amount: number;
  balance_after: number;
  description: string;
  created_at: string;
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
  page?: number;
  pageSize?: number;
}
