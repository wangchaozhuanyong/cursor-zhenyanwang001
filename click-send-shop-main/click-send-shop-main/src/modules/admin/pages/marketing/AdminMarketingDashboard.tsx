import { useEffect, useMemo, useState } from "react";
import { BarChart3, CalendarClock, Gift, Link2, PlusCircle, Star, Ticket } from "lucide-react";
import { useNavigate } from "react-router-dom";
import * as activityService from "@/services/admin/activityService";
import * as couponService from "@/services/admin/couponService";
import { fetchAdminPointsRecords } from "@/services/admin/pointsService";
import { Tx } from "@/components/admin/AdminText";
import { fetchAdminRewardRecords } from "@/services/admin/rewardService";

export default function AdminMarketingDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ active: 0, upcoming: 0, ended: 0, coupons: 0, pointsToday: 0, rewardToday: 0 });

  useEffect(() => {
    void (async () => {
      const [acts, coupons, points, rewards] = await Promise.all([
        activityService.fetchActivities({ page: 1, pageSize: 50 }).catch(() => ({ list: [] as any[] })),
        couponService.fetchCoupons({ page: 1, pageSize: 1 }).catch(() => ({ total: 0 } as any)),
        fetchAdminPointsRecords({ page: 1, pageSize: 20 }).catch(() => ({ list: [] as any[] })),
        fetchAdminRewardRecords({ page: 1, pageSize: 20 }).catch(() => ({ list: [] as any[] })),
      ]);
      const list = acts.list || [];
      setStats({
        active: list.filter((x) => x.status === "active").length,
        upcoming: list.filter((x) => x.status === "scheduled").length,
        ended: list.filter((x) => x.status === "ended").length,
        coupons: Number((coupons as any).total || 0),
        pointsToday: (points.list || []).filter((x: any) => String(x.created_at || "").slice(0, 10) === new Date().toISOString().slice(0, 10)).reduce((s: number, x: any) => s + Math.max(0, Number(x.amount || 0)), 0),
        rewardToday: (rewards.list || []).filter((x: any) => String(x.created_at || "").slice(0, 10) === new Date().toISOString().slice(0, 10)).reduce((s: number, x: any) => s + Number(x.amount || 0), 0),
      });
    })();
  }, []);

  const cards = useMemo(() => [
    { t: "进行中活动", v: stats.active },
    { t: "即将开始", v: stats.upcoming },
    { t: "已结束", v: stats.ended },
    { t: "可用优惠券", v: stats.coupons },
    { t: "今日积分发放", v: stats.pointsToday },
    { t: "今日返现金额", v: stats.rewardToday.toFixed(2) },
  ], [stats]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground"><Tx>活动管理 / 活动总览</Tx></h1>
        <p className="mt-1 text-sm text-muted-foreground"><Tx>营销活动、优惠券、积分与返现的一体化运营视图。</Tx></p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => <div key={c.t} className="rounded-xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">{c.t}</p><p className="mt-1 text-2xl font-bold">{c.v}</p></div>)}
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold"><Tx>快捷入口</Tx></h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <button onClick={() => navigate("/admin/marketing/activities/new?type=flash_sale")} className="rounded-lg border border-border px-3 py-2 text-sm text-left"><CalendarClock className="inline mr-2 h-4 w-4" /><Tx>新建秒杀活动</Tx></button>
          <button onClick={() => navigate("/admin/marketing/activities/new?type=full_reduction")} className="rounded-lg border border-border px-3 py-2 text-sm text-left"><BarChart3 className="inline mr-2 h-4 w-4" /><Tx>新建满减活动</Tx></button>
          <button onClick={() => navigate("/admin/marketing/coupons/new")} className="rounded-lg border border-border px-3 py-2 text-sm text-left"><Ticket className="inline mr-2 h-4 w-4" /><Tx>新建优惠券</Tx></button>
          <button onClick={() => navigate("/admin/marketing/points")} className="rounded-lg border border-border px-3 py-2 text-sm text-left"><Star className="inline mr-2 h-4 w-4" /><Tx>积分管理</Tx></button>
          <button onClick={() => navigate("/admin/marketing/rewards")} className="rounded-lg border border-border px-3 py-2 text-sm text-left"><Gift className="inline mr-2 h-4 w-4" /><Tx>返现管理</Tx></button>
          <button onClick={() => navigate("/admin/marketing/invites")} className="rounded-lg border border-border px-3 py-2 text-sm text-left"><Link2 className="inline mr-2 h-4 w-4" /><Tx>邀请奖励</Tx></button>
          <button onClick={() => navigate("/admin/marketing/activities/new")} className="rounded-lg border border-border px-3 py-2 text-sm text-left"><PlusCircle className="inline mr-2 h-4 w-4" /><Tx>新建活动</Tx></button>
        </div>
      </div>
    </div>
  );
}
