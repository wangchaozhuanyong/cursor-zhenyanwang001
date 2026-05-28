import { get } from "@/api/request";
import type { MemberLevel } from "@/types/user";

export interface MemberBenefit {
  type: string;
  name: string;
  icon?: string;
  description: string;
}

export interface MemberBenefitsLevel extends MemberLevel {
  benefits: MemberBenefit[];
}

export interface MemberBenefitsOverview {
  user_id: string;
  nickname: string;
  avatar: string;
  current_points: number;
  current_growth_value: number;
  birthday_completed: boolean;
  profile_completed: boolean;
  current_level: MemberBenefitsLevel | null;
  next_level: MemberLevel | null;
  points_to_next_level: number;
  growth_to_next_level: number;
  orders_to_next_level: number;
  all_levels: MemberBenefitsLevel[];
  stats: {
    total_spent: number;
    order_count: number;
  };
}

export async function fetchMemberBenefits() {
  const res = await get<MemberBenefitsOverview>("/user/member-benefits");
  return res.data;
}
