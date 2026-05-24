import { formatDateTime } from "@/utils/formatDateTime";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Gift, Loader2, ShoppingBag, TrendingDown, TrendingUp, Users } from "lucide-react";
import { useGoBack } from "@/hooks/useGoBack";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import * as rewardService from "@/services/rewardService";
import { useLoyaltyVisibility } from "@/hooks/useLoyaltyVisibility";
import type { RewardConfig, RewardTransaction, RewardTransactionCategory } from "@/types/reward";
import {
  THEME_ACCENT_HERO_ICON,
  THEME_ACCENT_HERO_ICON_WRAP,
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

const PAGE_SIZE = 20;
const DEFAULT_BALANCE_LABEL = "购物可用返现";
const DEFAULT_USAGE_NOTICE = "返现金额仅可用于购物，不可提现。";

type TabKey = "all" | RewardTransactionCategory;

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: "all", label: "全部" },
  { key: "income", label: "入账" },
  { key: "spend", label: "消费抵扣" },
  { key: "reverse", label: "冲正/退回" },
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

  return (
    <StoreAccountLayout title="返现记录" onBack={goBack} className="store-page pb-6" mainClassName="sm:px-4 lg:py-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className={`relative overflow-hidden rounded-2xl p-6 ${THEME_ACCENT_HERO_SHELL}`}
      >
        <div
          className="pointer-events-none absolute -right-6 -top-6 h-32 w-32 rounded-full"
          style={{ background: "color-mix(in srgb, var(--theme-coupon-accent-foreground) 12%, transparent)" }}
        />
        <div className="relative flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className={THEME_ACCENT_HERO_LABEL}>{balanceLabel}</p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className={`store-stat-value ${THEME_ACCENT_HERO_VALUE}`}>
                <span className="mr-1 text-[14px] font-bold leading-none sm:text-base">RM</span>
                {money(config?.balance ?? 0)}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {[
                { label: "累计获得", value: `+${money(config?.stats.totalEarned ?? 0)}` },
                { label: "累计消费", value: `-${money(config?.stats.totalSpent ?? 0)}` },
                { label: "待入账", value: money(config?.pendingAmount ?? 0) },
              ].map((item) => (
                <div key={item.label} className="rounded-xl bg-[color-mix(in_srgb,var(--theme-coupon-accent-foreground)_10%,transparent)] px-2 py-2 text-center">
                  <p className={`text-[10px] ${THEME_ACCENT_HERO_MUTED}`}>{item.label}</p>
                  <p className={`mt-1 text-xs font-semibold ${THEME_ACCENT_HERO_VALUE}`}>{item.value}</p>
                </div>
              ))}
            </div>
            <p className={`mt-4 text-xs leading-relaxed ${THEME_ACCENT_HERO_SUBTLE}`}>{usageNotice}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => navigate("/")}
                className={cn("inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold", THEME_BTN_PRICE)}
              >
                <ShoppingBag size={14} />
                去购物
              </button>
              {inviteEnabled ? (
                <button
                  type="button"
                  onClick={() => navigate("/invite")}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[color-mix(in_srgb,var(--theme-coupon-accent-foreground)_35%,transparent)] px-4 py-2 text-xs font-semibold text-[var(--theme-coupon-accent-foreground)]"
                >
                  <Users size={14} />
                  邀请好友赚返现
                </button>
              ) : null}
            </div>
          </div>
          <div className={`hidden h-16 w-16 shrink-0 sm:flex ${THEME_ACCENT_HERO_ICON_WRAP}`}>
            <Gift size={32} className={THEME_ACCENT_HERO_ICON} />
          </div>
        </div>
      </motion.div>

      <div className="mt-5 flex rounded-2xl bg-[color-mix(in_srgb,var(--theme-primary)_8%,var(--theme-surface))] p-1 ring-1 ring-[var(--theme-border)]">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => void handleTabChange(item.key)}
            className={cn(
              "relative flex-1 rounded-xl py-3 text-sm font-medium transition-all",
              tab === item.key
                ? "bg-[var(--theme-surface)] text-[var(--theme-text-on-surface)] shadow-[var(--theme-shadow)]"
                : "text-[color-mix(in_srgb,var(--theme-text-on-surface)_72%,var(--theme-text-muted))]",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-5">
        <h3 className="mb-3 text-sm font-semibold text-foreground">返现明细</h3>
        {loading ? (
          <div className="flex items-center justify-center rounded-xl border border-border bg-card p-10">
            <Loader2 size={20} className="animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card p-10 text-center">
            <p className="text-sm text-muted-foreground">{error}</p>
            <button type="button" onClick={() => void loadInitial()} className={cn("rounded-full px-5 py-2 text-sm font-semibold", THEME_BTN_PRICE)}>
              重试
            </button>
          </div>
        ) : records.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">暂无返现记录</p>
            <p className="mt-2 text-xs text-muted-foreground">邀请好友付款成功或购物使用返现余额后，会在这里显示明细。</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {inviteEnabled ? (
                <button type="button" onClick={() => navigate("/invite")} className={cn("rounded-full px-4 py-2 text-xs font-semibold", THEME_BTN_PRICE)}>
                  去邀请好友
                </button>
              ) : null}
              <button type="button" onClick={() => navigate("/")} className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-foreground">
                去购物
              </button>
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
                      <button
                        key={record.id}
                        type="button"
                        disabled={!orderPath}
                        onClick={() => orderPath && navigate(orderPath)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-xl border border-border bg-card px-[var(--store-card-x)] py-[var(--store-card-y)] text-left sm:p-4",
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
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            {hasMore ? (
              <button
                type="button"
                onClick={() => void loadMore()}
                disabled={loadingMore}
                className="w-full rounded-xl border border-border bg-card py-3 text-sm text-muted-foreground transition-colors hover:bg-secondary disabled:opacity-60"
              >
                {loadingMore ? "加载中..." : "加载更多"}
              </button>
            ) : null}
          </div>
        )}
      </div>
    </StoreAccountLayout>
  );
}
