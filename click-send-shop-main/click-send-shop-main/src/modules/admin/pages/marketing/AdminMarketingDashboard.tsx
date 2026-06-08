import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, CalendarClock, Gift, Link2, PlusCircle, Star, Ticket } from "lucide-react";
import * as activityService from "@/services/admin/activityService";
import * as couponService from "@/services/admin/couponService";
import { fetchAdminPointsRecords } from "@/services/admin/pointsService";
import { adminQueryKeys } from "@/lib/adminQueryKeys";
import { Tx } from "@/components/admin/AdminText";
import AdminPageShell from "@/components/admin/AdminPageShell";
import PermissionGate from "@/components/admin/PermissionGate";
import { fetchAdminRewardRecords } from "@/services/admin/rewardService";
import type { MarketingActivity } from "@/types/activity";
import type { PointsRecord } from "@/types/points";
import type { RewardRecord } from "@/types/reward";
import { useAdminT } from "@/hooks/useAdminT";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import { useAdminNavigation } from "@/hooks/useAdminNavigation";

const EMPTY_MARKETING_STATS = {
  active: 0,
  upcoming: 0,
  ended: 0,
  coupons: 0,
  pointsToday: 0,
  rewardToday: 0,
};

export default function AdminMarketingDashboard() {
  const { tText } = useAdminT();
  const adminNavigate = useAdminNavigation();

  const dashboardQuery = useQuery({
    queryKey: adminQueryKeys.marketingDashboard(),
    queryFn: async () => {
      const [acts, coupons, points, rewards] = await Promise.all([
        activityService.fetchActivities({ page: 1, pageSize: 50 }).catch(() => ({ list: [] as MarketingActivity[], total: 0, page: 1, pageSize: 50 })),
        couponService.fetchCoupons({ page: 1, pageSize: 1 }).catch(() => ({ list: [], total: 0, page: 1, pageSize: 1 })),
        fetchAdminPointsRecords({ page: 1, pageSize: 20 }).catch(() => ({
          list: [] as PointsRecord[],
          total: 0,
          page: 1,
          pageSize: 20,
          stats: { totalEarned: 0, totalDeducted: 0, totalRecords: 0, activeUsers: 0 },
        })),
        fetchAdminRewardRecords({ page: 1, pageSize: 20 }).catch(() => ({
          list: [] as RewardRecord[],
          total: 0,
          page: 1,
          pageSize: 20,
          stats: { settledAmount: 0, reversedAmount: 0, totalRecords: 0, rewardedUsers: 0 },
        })),
      ]);
      const list = acts.list || [];
      const today = new Date().toISOString().slice(0, 10);
      return {
        active: list.filter((item) => item.status === "active").length,
        upcoming: list.filter((item) => item.status === "scheduled").length,
        ended: list.filter((item) => item.status === "ended").length,
        coupons: Number(coupons.total || 0),
        pointsToday: (points.list || [])
          .filter((item) => String(item.created_at || "").slice(0, 10) === today)
          .reduce((sum, item) => sum + Math.max(0, Number(item.amount || 0)), 0),
        rewardToday: (rewards.list || [])
          .filter((item) => String(item.created_at || "").slice(0, 10) === today)
          .reduce((sum, item) => sum + Number(item.amount || 0), 0),
      };
    },
    staleTime: 60_000,
  });

  const stats = dashboardQuery.data ?? EMPTY_MARKETING_STATS;

  const cards = useMemo(
    () => [
      { t: tText("进行中活动"), v: stats.active },
      { t: tText("即将开始"), v: stats.upcoming },
      { t: tText("已结束"), v: stats.ended },
      { t: tText("可用优惠券"), v: stats.coupons },
      { t: tText("今日积分发放"), v: stats.pointsToday },
      { t: tText("今日返现金额"), v: stats.rewardToday.toFixed(2) },
    ],
    [stats, tText],
  );

  return (
    <AdminPageShell hint={<Tx>营销活动、优惠券、积分与返现的一体化运营视图。</Tx>}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <div key={card.t} className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">{card.t}</p>
            <p className="mt-1 text-2xl font-bold">{dashboardQuery.isLoading && !dashboardQuery.data ? "…" : card.v}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold"><Tx>快捷入口</Tx></h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <PermissionGate permission="activity.manage">
            <UnifiedButton type="button" onClick={() => { void adminNavigate("/admin/marketing/activities/new?type=flash_sale"); }} className="rounded-lg border border-border px-3 py-2 text-left text-sm"><CalendarClock className="mr-2 inline h-4 w-4" /><Tx>新建秒杀活动</Tx></UnifiedButton>
          </PermissionGate>
          <PermissionGate permission="activity.manage">
            <UnifiedButton type="button" onClick={() => { void adminNavigate("/admin/marketing/activities/new?type=full_reduction"); }} className="rounded-lg border border-border px-3 py-2 text-left text-sm"><BarChart3 className="mr-2 inline h-4 w-4" /><Tx>新建满减活动</Tx></UnifiedButton>
          </PermissionGate>
          <PermissionGate permission="coupon.manage">
            <UnifiedButton type="button" onClick={() => { void adminNavigate("/admin/marketing/coupons/new"); }} className="rounded-lg border border-border px-3 py-2 text-left text-sm"><Ticket className="mr-2 inline h-4 w-4" /><Tx>新建礼券</Tx></UnifiedButton>
          </PermissionGate>
          <PermissionGate permission="points.manage">
            <UnifiedButton type="button" onClick={() => { void adminNavigate("/admin/marketing/points"); }} className="rounded-lg border border-border px-3 py-2 text-left text-sm"><Star className="mr-2 inline h-4 w-4" /><Tx>积分管理</Tx></UnifiedButton>
          </PermissionGate>
          <PermissionGate permission="referral.manage">
            <UnifiedButton type="button" onClick={() => { void adminNavigate("/admin/marketing/rewards"); }} className="rounded-lg border border-border px-3 py-2 text-left text-sm"><Gift className="mr-2 inline h-4 w-4" /><Tx>返现管理</Tx></UnifiedButton>
          </PermissionGate>
          <PermissionGate permission="invite.view">
            <UnifiedButton type="button" onClick={() => { void adminNavigate("/admin/marketing/invites"); }} className="rounded-lg border border-border px-3 py-2 text-left text-sm"><Link2 className="mr-2 inline h-4 w-4" /><Tx>邀请奖励</Tx></UnifiedButton>
          </PermissionGate>
          <PermissionGate permission="activity.manage">
            <UnifiedButton type="button" onClick={() => { void adminNavigate("/admin/marketing/activities/new"); }} className="rounded-lg border border-border px-3 py-2 text-left text-sm"><PlusCircle className="mr-2 inline h-4 w-4" /><Tx>新建活动</Tx></UnifiedButton>
          </PermissionGate>
        </div>
      </div>
    </AdminPageShell>
  );
}
