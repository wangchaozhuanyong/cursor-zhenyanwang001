import { useEffect, useMemo, useState } from "react";
import { BadgePercent, ChevronRight, Gift, ShieldCheck, Sparkles, Truck } from "lucide-react";
import StoreAccountLayout from "@/components/store/StoreAccountLayout";
import * as memberBenefitsService from "@/services/memberBenefitsService";
import type { MemberBenefitsOverview, MemberBenefit } from "@/services/memberBenefitsService";
import { cn } from "@/lib/utils";

const CARD_CLASS = "rounded-2xl bg-[var(--theme-surface)] p-4 shadow-[var(--theme-shadow)]";

function benefitIcon(type: string) {
  if (type === "discount") return BadgePercent;
  if (type === "points_multiplier") return Sparkles;
  if (type === "free_shipping") return Truck;
  if (type === "birthday_gift") return Gift;
  return ShieldCheck;
}

function benefitSummary(benefits: MemberBenefit[]) {
  return benefits.map((benefit) => benefit.name).join(" · ") || "会员专属服务";
}

export default function MemberBenefits() {
  const [data, setData] = useState<MemberBenefitsOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    memberBenefitsService.fetchMemberBenefits()
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const currentLevel = data?.current_level;
  const nextLevel = data?.next_level;
  const progressText = useMemo(() => {
    if (!nextLevel) return "你已达到当前最高会员等级";
    const spent = Number(data?.growth_to_next_level || 0);
    const orders = Number(data?.orders_to_next_level || 0);
    if (spent <= 0 && orders <= 0) return `已满足 ${nextLevel.name} 升级条件`;
    return `距离 ${nextLevel.name} 还差 RM ${spent.toFixed(2)} 消费或 ${orders} 笔有效订单`;
  }, [data?.growth_to_next_level, data?.orders_to_next_level, nextLevel]);

  return (
    <StoreAccountLayout title="会员权益">
      <div className="space-y-4">
        <section className={cn(CARD_CLASS, "overflow-hidden")}>
          {loading ? (
            <div className="h-28 animate-pulse rounded-xl bg-[var(--theme-bg)]" />
          ) : (
            <>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-[var(--theme-text-muted-on-surface)]">当前会员等级</p>
                  <h1 className="mt-1 truncate text-2xl font-bold text-[var(--theme-text)]">
                    {currentLevel?.name || "普通会员"}
                  </h1>
                  <p className="mt-2 text-sm leading-6 text-[var(--theme-text-muted-on-surface)]">
                    {currentLevel?.description || benefitSummary(currentLevel?.benefits || [])}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-[var(--theme-primary)] px-3 py-1 text-xs font-semibold text-[var(--theme-primary-foreground)]">
                  会员权益
                </span>
              </div>
              <div className="mt-4 rounded-xl bg-[var(--theme-bg)] p-3">
                <p className="text-xs text-[var(--theme-text-muted-on-surface)]">升级进度</p>
                <p className="mt-1 text-sm font-medium text-[var(--theme-text)]">{progressText}</p>
                <p className="mt-1 text-xs text-[var(--theme-text-muted-on-surface)]">
                  当前有效消费 RM {Number(data?.stats.total_spent || 0).toFixed(2)} · 有效订单 {data?.stats.order_count || 0} 笔
                </p>
              </div>
            </>
          )}
        </section>

        <section className={CARD_CLASS}>
          <h2 className="text-base font-semibold text-[var(--theme-text)]">当前等级权益</h2>
          <div className="mt-3 grid gap-3">
            {(currentLevel?.benefits || []).map((benefit) => {
              const Icon = benefitIcon(benefit.type);
              return (
                <div key={`${benefit.type}-${benefit.name}`} className="flex gap-3 rounded-xl bg-[var(--theme-bg)] p-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--theme-primary)]/12 text-[var(--theme-primary)]">
                    <Icon size={20} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-[var(--theme-text)]">{benefit.name}</span>
                    <span className="mt-1 block text-xs leading-5 text-[var(--theme-text-muted-on-surface)]">{benefit.description}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        <section className={CARD_CLASS}>
          <h2 className="text-base font-semibold text-[var(--theme-text)]">等级权益对比</h2>
          <div className="mt-3 divide-y divide-[var(--theme-border)]">
            {(data?.all_levels || []).map((level) => (
              <div key={level.id} className="flex items-center justify-between gap-3 py-3">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-[var(--theme-text)]">{level.name}</span>
                  <span className="mt-1 block truncate text-xs text-[var(--theme-text-muted-on-surface)]">
                    {benefitSummary(level.benefits)}
                  </span>
                </span>
                <ChevronRight size={16} className="shrink-0 text-[var(--theme-text-muted-on-surface)]" />
              </div>
            ))}
          </div>
        </section>
      </div>
    </StoreAccountLayout>
  );
}
