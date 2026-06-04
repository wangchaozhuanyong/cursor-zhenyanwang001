import { formatDateTime } from "@/utils/formatDateTime";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, Clock, Gift, Loader2, ShoppingBag, TrendingDown, TrendingUp, Users, Wallet } from "lucide-react";
import { useGoBack } from "@/hooks/useGoBack";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import * as rewardService from "@/services/rewardService";
import { useLoyaltyVisibility } from "@/hooks/useLoyaltyVisibility";
import type { RewardConfig, RewardTransaction, RewardTransactionCategory } from "@/types/reward";
import {
  THEME_ACCENT_HERO_ICON,
  THEME_ACCENT_HERO_LABEL,
  THEME_ACCENT_HERO_MUTED,
  THEME_ACCENT_HERO_SHELL,
  THEME_ACCENT_HERO_SUBTLE,
  THEME_ACCENT_HERO_VALUE,
  THEME_BTN_PRICE,
  THEME_ROW_ICON_NEGATIVE,
  THEME_ROW_ICON_POSITIVE,
  THEME_TEXT_DANGER,
  THEME_TEXT_SUCCESS,
} from "@/utils/themeVisuals";
import StoreAccountLayout from "@/components/store/StoreAccountLayout";
import { cn } from "@/lib/utils";
import { formatRewardTransactionLabel, groupRewardRecordsByMonth } from "@/utils/rewardDisplayLabels";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

const PAGE_SIZE = 20;
const DEFAULT_BALANCE_LABEL = "购物可用返现";
const DEFAULT_USAGE_NOTICE = "返现金额仅可用于购物，不可提现。";

type TabKey = "all" | RewardTransactionCategory;

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: "all", label: "全部" },
  { key: "income", label: "入账" },
  { key: "spend", label: "消费抵扣" },
  { key: "reverse", label: "明细" },
];

function money(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(2) : "0.00";
}

export default function Rewards() {
  const goBack = useGoBack();
  const navigate = useNavigate();
  const { config: loyaltyConfig, loading: loyaltyLoading } = useLoyaltyVisibility();
  const [config, setConfig] = useState<RewardConfig | null>(null);
  const [records, setRecords] = useState<RewardTransaction[]>([]);
  const [tab, setTab] = useState<TabKey>("all");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const inviteEnabled = loyaltyConfig?.reward?.referralEnabled !== false;

  useEffect(() => {
    if (loyaltyLoading) return;
    if (loyaltyConfig && !loyaltyConfig.reward.displayEnabled) navigate("/profile", { replace: true });
  }, [loyaltyConfig, loyaltyLoading, navigate]);

  const loadConfig = useCallback(async () => {
    const data = await rewardService.fetchRewardConfig();
    setConfig(data);
    return data;
  }, []);

  const loadRecords = useCallback(async (nextPage: number, category: TabKey, append = false) => {
    const data = await rewardService.fetchRewardTransactions({
      page: nextPage,
      pageSize: PAGE_SIZE,
      category: category === "all" ? undefined : category,
    });
    setRecords((prev) => (append ? [...prev, ...data.list] : data.list));
    setPage(nextPage);
    setHasMore(data.list.length >= PAGE_SIZE);
  }, []);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([loadConfig(), loadRecords(1, "all")]);
      setTab("all");
    } catch {
      setError("加载失败");
    } finally {
      setLoading(false);
    }
  }, [loadConfig, loadRecords]);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  const handleTabChange = async (nextTab: TabKey) => {
    if (nextTab === tab) return;
    setTab(nextTab);
    setLoading(true);
    setError(null);
    try {
      await loadRecords(1, nextTab);
    } catch {
      setError("加载失败");
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      await loadRecords(page + 1, tab, true);
    } catch {
      // ignore
    } finally {
      setLoadingMore(false);
    }
  };

  const groupedRecords = useMemo(() => groupRewardRecordsByMonth(records), [records]);
  const balanceLabel = config?.display.balanceLabel?.trim() || DEFAULT_BALANCE_LABEL;
  const usageNotice = config?.display.usageNotice?.trim() || DEFAULT_USAGE_NOTICE;
  const summaryItems = [
    { label: "累计获得", value: `+${money(config?.stats.totalEarned ?? 0)}`, icon: Gift },
    { label: "累计抵扣", value: `-${money(config?.stats.totalSpent ?? 0)}`, icon: Wallet },
    { label: "待入账", value: money(config?.pendingAmount ?? 0), icon: Clock },
  ];

  return (
    <StoreAccountLayout title="返现记录" onBack={goBack} className="store-page pb-8" mainClassName="sm:px-4 lg:py-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn("relative overflow-hidden rounded-[28px] px-6 py-7 shadow-[0_18px_42px_-24px_rgba(238,54,26,0.72)] sm:px-7", THEME_ACCENT_HERO_SHELL)}
        style={{
          background:
            "linear-gradient(135deg, color-mix(in srgb, var(--theme-price) 92%, #ff6f48) 0%, color-mix(in srgb, var(--theme-danger) 78%, #ff512f) 58%, color-mix(in srgb, var(--theme-danger) 96%, #d92713) 100%)",
        }}
      >
        <div
          className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full"
          style={{ background: "color-mix(in srgb, var(--theme-coupon-accent-foreground) 13%, transparent)" }}
        />
        <div aria-hidden="true" className="pointer-events-none absolute -right-4 top-3 z-0 h-36 w-36 opacity-60 sm:right-6 sm:top-8 sm:h-40 sm:w-40 sm:opacity-95">
          <div
            className="absolute right-1 top-8 h-[92px] w-[72px] rotate-[13deg] rounded-[22px]"
            style={{
              background:
                "linear-gradient(145deg, color-mix(in srgb, var(--theme-danger) 72%, #ff8d67) 0%, color-mix(in srgb, var(--theme-danger) 92%, #c91f14) 100%)",
              boxShadow:
                "inset 0 1px 0 color-mix(in srgb, var(--theme-coupon-accent-foreground) 22%, transparent), 0 16px 30px color-mix(in srgb, #7a110b 26%, transparent)",
            }}
          >
            <div
              className="absolute inset-x-3 top-4 h-7 rounded-full"
              style={{ background: "color-mix(in srgb, var(--theme-coupon-accent-foreground) 12%, transparent)" }}
            />
          </div>
          <div
            className="absolute right-8 top-4 h-[112px] w-[84px] rotate-[-9deg] overflow-hidden rounded-[22px]"
            style={{
              background:
                "linear-gradient(150deg, color-mix(in srgb, var(--theme-price) 92%, #ff7c48) 0%, color-mix(in srgb, var(--theme-danger) 88%, #d62014) 68%, color-mix(in srgb, var(--theme-danger) 96%, #aa130c) 100%)",
              boxShadow:
                "inset 0 1px 0 color-mix(in srgb, var(--theme-coupon-accent-foreground) 28%, transparent), inset 0 -12px 24px color-mix(in srgb, #7a110b 18%, transparent), 0 18px 34px color-mix(in srgb, #7a110b 28%, transparent)",
            }}
          >
            <div
              className="absolute left-0 right-0 top-0 h-12"
              style={{
                background:
                  "linear-gradient(180deg, color-mix(in srgb, var(--theme-coupon-accent-foreground) 20%, transparent) 0%, color-mix(in srgb, var(--theme-coupon-accent-foreground) 4%, transparent) 100%)",
                clipPath: "polygon(0 0, 100% 0, 50% 100%)",
              }}
            />
            <div
              className="absolute left-1/2 top-[38px] flex h-10 w-10 -translate-x-1/2 items-center justify-center rounded-full text-[11px] font-extrabold"
              style={{
                color: "color-mix(in srgb, var(--theme-danger) 78%, #7d120b)",
                background:
                  "radial-gradient(circle at 35% 28%, color-mix(in srgb, var(--theme-coupon-accent-foreground) 82%, #ffd58f) 0%, color-mix(in srgb, var(--theme-warning) 92%, #ffbe4d) 64%, color-mix(in srgb, var(--theme-warning) 72%, #b85a11) 100%)",
                boxShadow:
                  "0 0 0 6px color-mix(in srgb, var(--theme-warning) 18%, transparent), inset 0 2px 4px color-mix(in srgb, var(--theme-coupon-accent-foreground) 42%, transparent)",
              }}
            >
              RM
            </div>
            <div
              className="absolute bottom-5 left-5 right-5 h-px"
              style={{ background: "color-mix(in srgb, var(--theme-coupon-accent-foreground) 24%, transparent)" }}
            />
            <div
              className="absolute -right-5 bottom-1 h-14 w-14 rounded-full"
              style={{ background: "color-mix(in srgb, var(--theme-coupon-accent-foreground) 12%, transparent)" }}
            />
          </div>
          <div
            className="absolute right-[82px] top-[92px] h-8 w-8 rounded-full"
            style={{
              background:
                "radial-gradient(circle at 35% 30%, color-mix(in srgb, var(--theme-coupon-accent-foreground) 86%, #ffe0a3) 0%, color-mix(in srgb, var(--theme-warning) 92%, #f59f24) 66%, color-mix(in srgb, var(--theme-warning) 72%, #a94d0b) 100%)",
              boxShadow: "0 8px 16px color-mix(in srgb, #7a110b 24%, transparent)",
            }}
          />
          <div
            className="absolute right-[30px] top-1 h-10 w-16 rounded-full blur-sm"
            style={{ background: "color-mix(in srgb, var(--theme-coupon-accent-foreground) 20%, transparent)" }}
          />
        </div>
        <div className="relative z-10 flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className={cn(THEME_ACCENT_HERO_LABEL, "text-[15px] font-semibold normal-case tracking-normal sm:text-base")}>{balanceLabel}</p>
              <span className="flex h-5 w-5 items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--theme-coupon-accent-foreground)_45%,transparent)] text-xs font-semibold text-[color-mix(in_srgb,var(--theme-coupon-accent-foreground)_75%,transparent)]">
                ?
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className={cn("store-stat-value tabular-nums leading-none", THEME_ACCENT_HERO_VALUE, "text-5xl sm:text-6xl")}>
                <span className="mr-3 text-[22px] font-extrabold leading-none sm:text-2xl">RM</span>
                {money(config?.balance ?? 0)}
              </span>
            </div>
            <p className={cn("mt-4 text-sm font-medium leading-relaxed sm:text-base", THEME_ACCENT_HERO_SUBTLE)}>{usageNotice}</p>
            <div className="mt-7 grid grid-cols-3 overflow-hidden rounded-[22px] bg-[color-mix(in_srgb,var(--theme-coupon-accent-foreground)_12%,transparent)] px-2 py-4 backdrop-blur-sm">
              {summaryItems.map((item, index) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    className={cn(
                      "flex min-w-0 flex-col items-center justify-center px-2 text-center",
                      index > 0 ? "border-l border-[color-mix(in_srgb,var(--theme-coupon-accent-foreground)_34%,transparent)]" : "",
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      <Icon size={17} className={THEME_ACCENT_HERO_ICON} />
                      <p className={cn("truncate text-[12px] font-semibold sm:text-sm", THEME_ACCENT_HERO_MUTED)}>{item.label}</p>
                    </div>
                    <p className={cn("mt-2 text-[22px] font-extrabold leading-none tabular-nums sm:text-2xl", THEME_ACCENT_HERO_VALUE)}>{item.value}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </motion.div>

      <div className="mt-4 overflow-hidden rounded-[24px] border border-[var(--theme-border)] bg-[var(--theme-surface)] shadow-[0_18px_42px_-32px_rgba(0,0,0,0.32)]">
        <div className={cn("grid", inviteEnabled ? "grid-cols-2" : "grid-cols-1")}>
          <UnifiedButton
            type="button"
            onClick={() => navigate("/")}
            className="group flex min-w-0 items-center justify-center gap-3 px-3 py-5 text-left transition-colors hover:bg-[color-mix(in_srgb,var(--theme-primary)_6%,var(--theme-surface))] sm:gap-4 sm:px-4"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--theme-price)_13%,var(--theme-surface))] text-[var(--theme-price)] sm:h-14 sm:w-14">
              <ShoppingBag size={23} />
            </span>
            <span className="min-w-0">
              <span className="block whitespace-nowrap text-sm font-semibold text-[var(--theme-text)] sm:text-base">去购物</span>
              <span className="mt-1 block whitespace-nowrap text-[11px] text-[var(--theme-text-muted)] sm:text-xs">使用返现抵扣</span>
            </span>
          </UnifiedButton>
          {inviteEnabled ? (
            <UnifiedButton
              type="button"
              onClick={() => navigate("/invite")}
              className="group flex min-w-0 items-center justify-center gap-3 border-l border-[var(--theme-border)] px-3 py-5 text-left transition-colors hover:bg-[color-mix(in_srgb,var(--theme-primary)_6%,var(--theme-surface))] sm:gap-4 sm:px-4"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--theme-danger)_11%,var(--theme-surface))] text-[var(--theme-danger)] sm:h-14 sm:w-14">
                <Users size={23} />
              </span>
              <span className="min-w-0">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="whitespace-nowrap text-sm font-semibold text-[var(--theme-text)] sm:text-base">邀请好友赚返现</span>
                  <ArrowRight size={14} className="hidden shrink-0 text-[var(--theme-text-muted)] sm:block" />
                </span>
                <span className="mt-1 block whitespace-nowrap text-[11px] text-[var(--theme-text-muted)] sm:text-xs">好友下单 你得返现</span>
              </span>
            </UnifiedButton>
          ) : null}
        </div>
      </div>

      <div className="mt-6 flex border-b border-[var(--theme-border)]">
        {TABS.map((item) => (
          <UnifiedButton
            key={item.key}
            type="button"
            onClick={() => void handleTabChange(item.key)}
            className={cn(
              "relative flex-1 rounded-none px-1 pb-3 pt-2 text-base font-medium transition-colors",
              tab === item.key
                ? "text-[var(--theme-price)] after:absolute after:bottom-0 after:left-1/2 after:h-1 after:w-14 after:-translate-x-1/2 after:rounded-full after:bg-[var(--theme-price)]"
                : "text-[color-mix(in_srgb,var(--theme-text)_62%,var(--theme-text-muted))]",
            )}
          >
            {item.label}
          </UnifiedButton>
        ))}
      </div>

      <div className="mt-7">
        <h3 className="mb-4 text-xl font-bold text-foreground">返现明细</h3>
        {loading ? (
          <div className="flex items-center justify-center rounded-[24px] border border-border bg-card p-12">
            <Loader2 size={20} className="animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-[24px] border border-border bg-card p-10 text-center">
            <p className="text-sm text-muted-foreground">{error}</p>
            <UnifiedButton type="button" onClick={() => void loadInitial()} className={cn("rounded-full px-5 py-2 text-sm font-semibold", THEME_BTN_PRICE)}>
              重试
            </UnifiedButton>
          </div>
        ) : records.length === 0 ? (
          <div className="rounded-[24px] border border-[color-mix(in_srgb,var(--theme-price)_16%,var(--theme-border))] bg-card px-6 py-10 text-center shadow-[0_18px_42px_-34px_rgba(238,54,26,0.42)] sm:px-8">
            <div className="mx-auto flex h-32 w-44 items-end justify-center">
              <div className="relative h-24 w-28 rounded-[22px] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--theme-danger)_36%,white)_0%,color-mix(in_srgb,var(--theme-danger)_70%,var(--theme-price))_100%)] shadow-[0_18px_35px_-26px_rgba(238,54,26,0.8)]">
                <div className="absolute -top-8 left-8 h-14 w-14 rounded-xl bg-[var(--theme-surface)] shadow-[0_12px_26px_-18px_rgba(0,0,0,0.3)]">
                  <div className="mx-auto mt-3 h-1 w-9 rounded-full bg-[color-mix(in_srgb,var(--theme-price)_20%,var(--theme-surface))]" />
                  <div className="mx-auto mt-3 h-1 w-9 rounded-full bg-[color-mix(in_srgb,var(--theme-price)_20%,var(--theme-surface))]" />
                </div>
                <div className="absolute -left-7 bottom-1 flex h-9 w-9 items-center justify-center rounded-full border-2 border-[color-mix(in_srgb,var(--theme-warning)_50%,white)] bg-[color-mix(in_srgb,var(--theme-warning)_28%,white)] text-xs font-bold text-[color-mix(in_srgb,var(--theme-warning)_84%,var(--theme-text))]">
                  ￥
                </div>
                <div className="absolute -right-6 bottom-1 flex h-9 w-9 items-center justify-center rounded-full border-2 border-[color-mix(in_srgb,var(--theme-warning)_50%,white)] bg-[color-mix(in_srgb,var(--theme-warning)_28%,white)] text-xs font-bold text-[color-mix(in_srgb,var(--theme-warning)_84%,var(--theme-text))]">
                  ￥
                </div>
                <div className="absolute right-[-12px] top-10 h-8 w-11 rounded-full bg-[color-mix(in_srgb,var(--theme-danger)_28%,var(--theme-surface))]" />
              </div>
            </div>
            <p className="mt-5 text-xl font-bold text-[var(--theme-text)]">暂无返现记录</p>
            <p className="mx-auto mt-3 max-w-[18rem] text-sm leading-relaxed text-muted-foreground">邀请好友付款成功或购物使用返现余额后，会在这里显示明细。</p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              {inviteEnabled ? (
                <UnifiedButton type="button" onClick={() => navigate("/invite")} className={cn("rounded-full px-8 py-3 text-sm font-semibold", THEME_BTN_PRICE)}>
                  去邀请好友
                </UnifiedButton>
              ) : null}
              <UnifiedButton type="button" onClick={() => navigate("/")} className="rounded-full border border-[var(--theme-price)] px-8 py-3 text-sm font-semibold text-[var(--theme-price)]">
                去购物
              </UnifiedButton>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {groupedRecords.map(([monthLabel, monthRecords]) => (
              <div key={monthLabel}>
                <p className="mb-2 text-xs font-medium text-muted-foreground">{monthLabel}</p>
                <div className="space-y-2">
                  {monthRecords.map((record) => {
                    const positive = Number(record.amount) >= 0;
                    const orderPath = record.order_id ? `/orders/${record.order_id}` : null;
                    return (
                      <UnifiedButton
                        key={record.id}
                        type="button"
                        disabled={!orderPath}
                        onClick={() => orderPath && navigate(orderPath)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-2xl border border-border bg-card px-[var(--store-card-x)] py-[var(--store-card-y)] text-left sm:p-4",
                          orderPath ? "transition-colors hover:bg-secondary/60" : "cursor-default",
                        )}
                      >
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${positive ? THEME_ROW_ICON_POSITIVE : THEME_ROW_ICON_NEGATIVE}`}>
                          {positive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">
                            {formatRewardTransactionLabel(record.type, record.reason)}
                          </p>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            {record.order_no ? `订单 ${record.order_no} · ` : ""}
                            {formatDateTime(record.created_at)}
                          </p>
                        </div>
                        <span className={`shrink-0 text-sm font-bold ${positive ? THEME_TEXT_SUCCESS : THEME_TEXT_DANGER}`}>
                          {Number(record.amount) > 0 ? "+" : ""}
                          {money(record.amount)}
                        </span>
                      </UnifiedButton>
                    );
                  })}
                </div>
              </div>
            ))}
            {hasMore ? (
              <UnifiedButton
                type="button"
                onClick={() => void loadMore()}
                disabled={loadingMore}
                className="w-full rounded-xl border border-border bg-card py-3 text-sm text-muted-foreground transition-colors hover:bg-secondary disabled:opacity-60"
              >
                {loadingMore ? "加载中..." : "加载更多"}
              </UnifiedButton>
            ) : null}
          </div>
        )}
      </div>
    </StoreAccountLayout>
  );
}
