import { useEffect, useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
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
  MEMBER_BENEFIT_SUMMARY_BG,
  MEMBER_BENEFIT_TILE_BG,
} from "@/utils/memberBenefitPresentation";

const CARD_CLASS = "rounded-2xl bg-[var(--theme-surface)] shadow-[var(--theme-shadow)]";

function HeroSkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-8 w-2/3 animate-pulse rounded-lg bg-[var(--theme-bg)]" />
      <div className="h-4 w-full animate-pulse rounded-lg bg-[var(--theme-bg)]" />
      <div className="h-16 animate-pulse rounded-xl bg-[var(--theme-bg)]" />
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

  const allLevels = data?.all_levels || [];
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
            "relative overflow-hidden rounded-3xl p-4",
          )}
        >
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "linear-gradient(135deg, color-mix(in srgb, var(--theme-primary) 12%, var(--theme-surface)) 0%, color-mix(in srgb, var(--theme-primary) 5%, var(--theme-surface)) 55%, var(--theme-surface) 100%)",
            }}
          />
          <div
            className="pointer-events-none absolute inset-y-0 right-0 w-28 opacity-70"
            style={{ background: "var(--theme-member-card-sheen)" }}
          />
          <div className="relative z-10">
            {loading ? (
              <HeroSkeleton />
            ) : (
              <>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <p className={`text-xs ${THEME_MEMBER_CARD_MUTED}`}>当前会员等级</p>
                    <h1 className="mt-1 text-2xl font-bold leading-tight text-[var(--theme-text)] sm:text-3xl">
                      {currentLevel?.name || "普通会员"}
                    </h1>
                    <p className="mt-2 line-clamp-3 text-sm leading-6 text-[var(--theme-text-muted-on-surface)]">
                      {currentLevel?.description || buildBenefitSummaryFromBenefits(currentLevel?.benefits || [], currentLevel)}
                    </p>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1 self-start rounded-full bg-[var(--theme-primary)] px-3 py-1.5 text-xs font-semibold text-[var(--theme-primary-foreground)]">
                    <Sparkles size={14} className="shrink-0" />
                    会员成长
                  </span>
                </div>

                <div className={cn("mt-4 rounded-2xl p-3", MEMBER_BENEFIT_SUMMARY_BG)}>
                  <p className="text-xs text-[var(--theme-text-muted-on-surface)]">升级进度</p>
                  <p className="mt-1 text-sm font-medium leading-6 text-[var(--theme-text)]">{progressText}</p>
                  <p className="mt-1 text-xs leading-5 text-[var(--theme-text-muted-on-surface)]">
                    当前有效消费 RM {Number(data?.stats.total_spent || 0).toFixed(2)} · 有效订单{" "}
                    {data?.stats.order_count || 0} 笔
                  </p>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--theme-bg)_88%,transparent)]">
                    <div
                      className="h-full rounded-full bg-[var(--theme-primary)] transition-[width] duration-500"
                      style={{ width: `${progressPercent}%` }}
                      role="progressbar"
                      aria-valuenow={progressPercent}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label="升级进度"
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </section>

        <section className={cn(CARD_CLASS, "p-4")}>
          <h2 className="text-base font-semibold text-[var(--theme-text)]">当前等级权益</h2>
          {loading ? (
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="min-h-[88px] animate-pulse rounded-2xl bg-[var(--theme-bg)]" />
              ))}
            </div>
          ) : (
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {benefitHighlightTiles.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className={cn("min-w-0 rounded-2xl p-3", MEMBER_BENEFIT_TILE_BG)}>
                    <Icon size={18} className="shrink-0 text-[var(--theme-primary)]" />
                    <p className="mt-2 line-clamp-1 text-sm font-semibold text-[var(--theme-text)]">{item.label}</p>
                    {item.value ? (
                      <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-[var(--theme-text-muted-on-surface)]">
                        {item.value}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className={cn(CARD_CLASS, "p-4")}>
          <h2 className="text-base font-semibold text-[var(--theme-text)]">等级权益对比</h2>
          {loading ? (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {[1, 2].map((i) => (
                <div key={i} className="min-h-[100px] animate-pulse rounded-2xl bg-[var(--theme-bg)]" />
              ))}
            </div>
          ) : (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {allLevels.map((level) => {
                const isCurrent = level.id === currentLevel?.id;
                return (
                  <div
                    key={level.id}
                    className={cn(
                      "min-w-0 rounded-2xl border p-3",
                      isCurrent
                        ? "border-[color-mix(in_srgb,var(--theme-primary)_35%,var(--theme-border))] bg-[color-mix(in_srgb,var(--theme-primary)_8%,var(--theme-surface))]"
                        : "border-[var(--theme-border)] bg-[var(--theme-bg)]",
                    )}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="min-w-0 text-sm font-semibold text-[var(--theme-text)]">{level.name}</p>
                      {isCurrent ? (
                        <span className="shrink-0 rounded-full bg-[var(--theme-primary)] px-2.5 py-1 text-xs font-semibold text-[var(--theme-primary-foreground)]">
                          当前等级
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-[var(--theme-text-muted-on-surface)]">
                      {buildBenefitSummaryFromBenefits(level.benefits || [], level)}
                    </p>
                    <p className="mt-2 text-[11px] leading-5 text-[var(--theme-text-muted-on-surface)]">
                      升级条件：{formatLevelRequirement(level)}
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
