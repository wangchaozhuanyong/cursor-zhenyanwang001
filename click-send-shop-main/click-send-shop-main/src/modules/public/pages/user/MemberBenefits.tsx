import { useEffect, useMemo, useState } from "react";
import StoreAccountLayout from "@/components/store/StoreAccountLayout";
import * as memberBenefitsService from "@/services/memberBenefitsService";
import type { MemberBenefitsOverview } from "@/services/memberBenefitsService";
import { cn } from "@/lib/utils";
import {
  THEME_MEMBER_CARD_MUTED,
  THEME_MEMBER_CARD_SHELL,
} from "@/utils/themeVisuals";
import {
  buildBenefitHighlightsFromLevel,
  buildBenefitSummaryFromBenefits,
  computeUpgradeProgress,
  formatLevelRequirement,
  MEMBER_BENEFIT_TILE_BG,
} from "@/utils/memberBenefitPresentation";

const CARD_CLASS = "rounded-2xl bg-[var(--theme-surface)] shadow-[var(--theme-shadow)]";

function HeroSkeleton() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="h-4 w-24 animate-pulse rounded-lg bg-[var(--theme-bg)]" />
        <div className="h-8 w-2/3 animate-pulse rounded-lg bg-[var(--theme-bg)]" />
        <div className="h-4 w-full animate-pulse rounded-lg bg-[var(--theme-bg)]" />
      </div>
      <div className="border-t border-[color-mix(in_srgb,var(--theme-member-card-muted)_35%,transparent)] pt-4">
        <div className="h-4 w-28 animate-pulse rounded-lg bg-[var(--theme-bg)]" />
        <div className="mt-3 h-2 animate-pulse rounded-full bg-[var(--theme-bg)]" />
      </div>
    </div>
  );
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
  const progressPercent = useMemo(() => computeUpgradeProgress(data), [data]);

  const progressText = useMemo(() => {
    if (!nextLevel) return "你已达到当前最高会员等级";
    const spent = Number(data?.growth_to_next_level || 0);
    const orders = Number(data?.orders_to_next_level || 0);
    if (spent <= 0 && orders <= 0) return `已满足 ${nextLevel.name} 升级条件`;
    return `距离 ${nextLevel.name} 还差 RM ${spent.toFixed(2)} 消费或 ${orders} 笔有效订单`;
  }, [data?.growth_to_next_level, data?.orders_to_next_level, nextLevel]);

  const orderedLevels = useMemo(() => {
    return [...(data?.all_levels || [])].sort((a, b) => {
      const orderDiff = Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0);
      if (orderDiff !== 0) return orderDiff;

      const spentDiff = Number(a.min_spent ?? 0) - Number(b.min_spent ?? 0);
      if (spentDiff !== 0) return spentDiff;

      return Number(a.min_orders ?? 0) - Number(b.min_orders ?? 0);
    });
  }, [data?.all_levels]);

  const benefitHighlightTiles = useMemo(
    () => buildBenefitHighlightsFromLevel(currentLevel),
    [currentLevel],
  );

  return (
    <StoreAccountLayout title="会员权益">
      <div className="space-y-4">
        <section
          className={cn(
            CARD_CLASS,
            THEME_MEMBER_CARD_SHELL,
            "overflow-hidden rounded-2xl p-4",
          )}
        >
          {loading ? (
            <HeroSkeleton />
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <p className={`text-xs ${THEME_MEMBER_CARD_MUTED}`}>当前会员等级</p>
                  <h1 className="mt-1 text-2xl font-bold leading-tight text-[var(--theme-member-card-foreground)]">
                    {currentLevel?.name || "普通会员"}
                  </h1>
                  <p className={`mt-2 text-sm leading-6 ${THEME_MEMBER_CARD_MUTED}`}>
                    {currentLevel?.description || buildBenefitSummaryFromBenefits(currentLevel?.benefits || [], currentLevel)}
                  </p>
                </div>

                <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm sm:block sm:min-w-[180px] sm:text-right">
                  <div>
                    <p className={`text-xs ${THEME_MEMBER_CARD_MUTED}`}>当前有效消费</p>
                    <p className="mt-1 font-semibold text-[var(--theme-member-card-foreground)]">
                      RM {Number(data?.stats.total_spent || 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="sm:mt-3">
                    <p className={`text-xs ${THEME_MEMBER_CARD_MUTED}`}>有效订单</p>
                    <p className="mt-1 font-semibold text-[var(--theme-member-card-foreground)]">{data?.stats.order_count || 0} 笔</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-[color-mix(in_srgb,var(--theme-member-card-muted)_35%,transparent)] pt-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[var(--theme-member-card-foreground)]">升级进度</p>
                    <p className={`mt-1 text-sm leading-6 ${THEME_MEMBER_CARD_MUTED}`}>{progressText}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-[var(--theme-member-card-badge-bg)] px-2.5 py-1 text-xs font-semibold text-[var(--theme-member-card-badge-fg)]">
                    {progressPercent}%
                  </span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--theme-member-card-subtle)]">
                  <div
                    className="h-full rounded-full bg-[var(--theme-member-card-badge-bg)] transition-[width] duration-500"
                    style={{ width: `${progressPercent}%` }}
                    role="progressbar"
                    aria-valuenow={progressPercent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="升级进度"
                  />
                </div>
              </div>
            </div>
          )}
        </section>

        <section className={cn(CARD_CLASS, "p-4")}>
          <h2 className="text-base font-semibold text-[var(--theme-text)]">当前等级权益</h2>
          {loading ? (
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="min-h-[88px] animate-pulse rounded-2xl bg-[var(--theme-bg)]" />
              ))}
            </div>
          ) : (
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {benefitHighlightTiles.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className={cn("min-w-0 rounded-2xl p-3", MEMBER_BENEFIT_TILE_BG)}>
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--theme-primary)_12%,var(--theme-surface))] text-[var(--theme-primary)]">
                        <Icon size={18} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold leading-5 text-[var(--theme-text)]">{item.label}</p>
                        {item.value ? (
                          <p className="mt-1 text-xs leading-5 text-[var(--theme-text-muted-on-surface)]">
                            {item.value}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className={cn(CARD_CLASS, "p-4")}>
          <h2 className="text-base font-semibold text-[var(--theme-text)]">等级权益对比</h2>
          {loading ? (
            <div className="mt-3 space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="min-h-[100px] animate-pulse rounded-2xl bg-[var(--theme-bg)]" />
              ))}
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              {orderedLevels.map((level) => {
                const isCurrent = level.id === currentLevel?.id;
                return (
                  <div
                    key={level.id}
                    className={cn(
                      "min-w-0 rounded-2xl border p-3",
                      isCurrent
                        ? "border-[color-mix(in_srgb,var(--theme-primary)_35%,var(--theme-border))] bg-[color-mix(in_srgb,var(--theme-primary)_8%,var(--theme-surface))]"
                        : "border-[var(--theme-border)] bg-[color-mix(in_srgb,var(--theme-surface)_70%,var(--theme-bg))]",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="min-w-0 text-sm font-semibold text-[var(--theme-text)]">{level.name}</p>
                      {isCurrent ? (
                        <span className="shrink-0 rounded-full bg-[var(--theme-primary)] px-2.5 py-1 text-xs font-semibold text-[var(--theme-primary-foreground)]">
                          当前等级
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-[11px] leading-5 text-[var(--theme-text-muted-on-surface)]">
                      升级条件：{formatLevelRequirement(level)}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-[var(--theme-text-muted-on-surface)]">
                      {buildBenefitSummaryFromBenefits(level.benefits || [], level)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </StoreAccountLayout>
  );
}
