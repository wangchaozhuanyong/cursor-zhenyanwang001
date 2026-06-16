import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { LucideIcon } from "lucide-react";
import { CalendarClock, ClipboardList, Gift, Megaphone, Star, Ticket } from "lucide-react";
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
import { useSiteCapabilities } from "@/hooks/useSiteCapabilities";

const EMPTY_MARKETING_STATS = {
  active: 0,
  upcoming: 0,
  ended: 0,
  coupons: 0,
  pointsToday: 0,
  rewardToday: 0,
};

type OperationAction = {
  label: string;
  to: string;
  permission: string;
  primary?: boolean;
};

type OperationCard = {
  key: string;
  icon: LucideIcon;
  title: string;
  metric: string | number;
  tone: string;
  permission?: string;
  anyOf?: string[];
  enabled?: boolean;
  actions: OperationAction[];
};

export default function AdminMarketingDashboard() {
  const { tText } = useAdminT();
  const adminNavigate = useAdminNavigation();
  const capabilities = useSiteCapabilities();

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

  const operationCards = useMemo<OperationCard[]>(
    () => [
      {
        key: "activities",
        icon: Megaphone,
        title: tText("活动管理"),
        metric: stats.active,
        tone: "text-[var(--theme-price)]",
        permission: "activity.manage",
        actions: [
          { label: tText("活动列表"), to: "/admin/marketing/activities", permission: "activity.manage", primary: true },
          { label: tText("新建秒杀"), to: "/admin/marketing/activities/new?type=flash_sale", permission: "activity.manage" },
          { label: tText("新建满减"), to: "/admin/marketing/activities/new?type=full_reduction", permission: "activity.manage" },
          { label: tText("新建折扣"), to: "/admin/marketing/activities/new?type=limited_time_discount", permission: "activity.manage" },
          { label: tText("新建活动"), to: "/admin/marketing/activities/new", permission: "activity.manage" },
          { label: tText("活动数据"), to: "/admin/reports/activities", permission: "report.view" },
        ],
      },
      {
        key: "coupon-campaigns",
        icon: CalendarClock,
        title: tText("领券活动"),
        metric: stats.coupons,
        tone: "text-emerald-600",
        permission: "coupon.view",
        enabled: capabilities.couponEnabled,
        actions: [
          { label: tText("活动列表"), to: "/admin/marketing/coupon-campaigns", permission: "coupon.view", primary: true },
          { label: tText("新建领券活动"), to: "/admin/marketing/coupon-campaigns/new", permission: "coupon.manage" },
          { label: tText("礼券模板"), to: "/admin/marketing/coupons", permission: "coupon.view" },
          { label: tText("领券记录"), to: "/admin/marketing/coupons/records", permission: "coupon.view" },
        ],
      },
      {
        key: "coupon-templates",
        icon: Ticket,
        title: tText("优惠券模板"),
        metric: stats.coupons,
        tone: "text-amber-600",
        permission: "coupon.view",
        enabled: capabilities.couponEnabled,
        actions: [
          { label: tText("模板列表"), to: "/admin/marketing/coupons", permission: "coupon.view", primary: true },
          { label: tText("新建礼券"), to: "/admin/marketing/coupons/new", permission: "coupon.manage" },
          { label: tText("优惠成本"), to: "/admin/reports/discounts/cost", permission: "report.view" },
        ],
      },
      {
        key: "points",
        icon: Star,
        title: tText("积分活动"),
        metric: stats.pointsToday,
        tone: "text-sky-600",
        permission: "points.manage",
        enabled: capabilities.pointsEnabled,
        actions: [
          { label: tText("积分管理"), to: "/admin/marketing/points", permission: "points.manage", primary: true },
          { label: tText("新建积分奖励"), to: "/admin/marketing/activities/new?type=points_reward", permission: "activity.manage" },
          { label: tText("新建签到奖励"), to: "/admin/marketing/activities/new?type=checkin_reward", permission: "activity.manage" },
        ],
      },
      {
        key: "reward",
        icon: Gift,
        title: tText("返现与邀请"),
        metric: stats.rewardToday.toFixed(2),
        tone: "text-fuchsia-600",
        anyOf: ["referral.manage", "invite.view"],
        actions: [
          { label: tText("返现管理"), to: "/admin/marketing/rewards", permission: "referral.manage", primary: true },
          { label: tText("邀请奖励"), to: "/admin/marketing/invites", permission: "invite.view" },
        ],
      },
      {
        key: "reports",
        icon: ClipboardList,
        title: tText("运营报表"),
        metric: stats.ended,
        tone: "text-indigo-600",
        permission: "report.view",
        actions: [
          { label: tText("活动转化"), to: "/admin/reports/promotions/conversion", permission: "report.view", primary: true },
          { label: tText("优惠成本"), to: "/admin/reports/discounts/cost", permission: "report.view" },
          { label: tText("活动分析"), to: "/admin/reports/activities", permission: "report.view" },
        ],
      },
    ],
    [capabilities.couponEnabled, capabilities.pointsEnabled, stats, tText],
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

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold"><Tx>统一活动管理</Tx></h2>
          <PermissionGate permission="activity.manage">
            <UnifiedButton type="button" onClick={() => { void adminNavigate("/admin/marketing/activities"); }} className="rounded-lg border border-border px-3 py-2 text-sm">
              <Megaphone className="mr-2 inline h-4 w-4" />
              <Tx>进入活动列表</Tx>
            </UnifiedButton>
          </PermissionGate>
        </div>
        <div className="grid gap-3 lg:grid-cols-3">
          {operationCards
            .filter((card) => card.enabled !== false)
            .map((card) => {
              const Icon = card.icon;
              return (
                <PermissionGate key={card.key} permission={card.permission} anyOf={card.anyOf}>
                  <div className="rounded-xl border border-border bg-card p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">{card.title}</p>
                        <p className={`mt-1 text-2xl font-bold ${card.tone}`}>{dashboardQuery.isLoading && !dashboardQuery.data ? "…" : card.metric}</p>
                      </div>
                      <Icon className={`h-5 w-5 ${card.tone}`} />
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {card.actions.map((action) => (
                        <PermissionGate key={`${card.key}-${action.label}`} permission={action.permission}>
                          <UnifiedButton
                            type="button"
                            onClick={() => { void adminNavigate(action.to); }}
                            className={`rounded-lg px-3 py-1.5 text-xs ${action.primary ? "bg-[var(--theme-price)] font-semibold text-[var(--theme-price-foreground)]" : "border border-border"}`}
                          >
                            {action.label}
                          </UnifiedButton>
                        </PermissionGate>
                      ))}
                    </div>
                  </div>
                </PermissionGate>
              );
            })}
        </div>
      </div>

    </AdminPageShell>
  );
}
