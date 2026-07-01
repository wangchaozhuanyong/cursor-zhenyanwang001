import { formatDateTime } from "@/utils/formatDateTime";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, CircleHelp, Clock, Gift, Loader2, ShoppingBag, TrendingDown, TrendingUp, Users, Wallet } from "lucide-react";
import { useGoBack } from "@/hooks/useGoBack";

import { motion } from "framer-motion";
import * as rewardService from "@/services/rewardService";
import { useLoyaltyVisibility } from "@/hooks/useLoyaltyVisibility";
import type { RewardConfig, RewardTransaction, RewardTransactionCategory } from "@/types/reward";
import {
  THEME_ROW_ICON_NEGATIVE,
  THEME_ROW_ICON_POSITIVE,
  THEME_TEXT_DANGER,
  THEME_TEXT_SUCCESS,
} from "@/utils/themeVisuals";
import StoreAccountLayout from "@/components/store/StoreAccountLayout";
import { cn } from "@/lib/utils";
import { formatRewardTransactionLabel, groupRewardRecordsByMonth } from "@/utils/rewardDisplayLabels";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import "@/styles/loyalty-routes.css";
import { useStorefrontNavigate } from "@/components/storefront-motion/useStorefrontNavigate";

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
  const navigate = useStorefrontNavigate();
  const { config: loyaltyConfig, loading: loyaltyLoading } = useLoyaltyVisibility();
  const [config, setConfig] = useState<RewardConfig | null>(null);
  const [records, setRecords] = useState<RewardTransaction[]>([]);
  const [tab, setTab] = useState<TabKey>("all");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [usageHelpOpen, setUsageHelpOpen] = useState(false);

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
    <TooltipProvider>
      <StoreAccountLayout
        title="返现记录"
        onBack={goBack}
        className="sf-next-page sf-next-route-page sf-next-account-route-page sf-next-rewards-page pb-8"
        mainClassName="sf-next-account-main sm:px-4 xl:py-6"
      >
      <motion.div
        initial={false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        className="sf-next-folio sf-next-rewards-folio"
      >
        <div className="sf-next-folio__topline">
          <div className="sf-next-rewards-folio__label">
            <p className="sf-next-folio__eyebrow">{balanceLabel}</p>
            <Tooltip open={usageHelpOpen} onOpenChange={setUsageHelpOpen}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label="查看返现说明"
                  onClick={() => setUsageHelpOpen((open) => !open)}
                  className="sf-next-folio__help"
                >
                  <CircleHelp size={14} strokeWidth={2.4} aria-hidden="true" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" align="start" sideOffset={8} className="max-w-[15rem] whitespace-normal rounded-xl px-3 py-2 text-xs leading-relaxed shadow-xl">
                {usageNotice}
              </TooltipContent>
            </Tooltip>
          </div>
          <span className="sf-next-folio__status">购物抵扣</span>
        </div>
        <div className="sf-next-folio__value-row">
          <span className="sf-next-folio__unit">RM</span>
          <strong className="sf-next-folio__value">{money(config?.balance ?? 0)}</strong>
        </div>
        <div className="sf-next-folio__meta sf-next-rewards-folio__meta">
          {summaryItems.map((item) => {
            const Icon = item.icon;
            return (
              <span key={item.label} className="sf-next-folio__meta-item">
                <span className="sf-next-rewards-folio__meta-label">
                  <Icon size={14} aria-hidden />
                  {item.label}
                </span>
                <strong className="sf-next-folio__meta-value">{item.value}</strong>
              </span>
            );
          })}
        </div>
      </motion.div>

      <section className="sf-next-rewards-actions" aria-label="返现操作">
        <div className={cn("sf-next-rewards-actions__grid", inviteEnabled ? "is-two" : "is-one")}>
          <UnifiedButton
            type="button"
            onClick={() => navigate("/")}
            className="sf-next-rewards-action"
          >
            <span className="sf-next-rewards-action__icon">
              <ShoppingBag size={23} />
            </span>
            <span className="sf-next-rewards-action__copy">
              <strong>去购物</strong>
              <small>使用返现抵扣</small>
            </span>
            <ArrowRight size={15} className="sf-next-rewards-action__arrow" aria-hidden />
          </UnifiedButton>
          {inviteEnabled ? (
            <UnifiedButton
              type="button"
              onClick={() => navigate("/invite")}
              className="sf-next-rewards-action"
            >
              <span className="sf-next-rewards-action__icon">
                <Users size={23} />
              </span>
              <span className="sf-next-rewards-action__copy">
                <strong>邀请返现</strong>
                <small>好友下单后记录</small>
              </span>
              <ArrowRight size={15} className="sf-next-rewards-action__arrow" aria-hidden />
            </UnifiedButton>
          ) : null}
        </div>
      </section>

      <div className="sf-next-rewards-tabs" role="tablist" aria-label="返现记录筛选">
        {TABS.map((item) => (
          <UnifiedButton
            key={item.key}
            type="button"
            role="tab"
            aria-selected={tab === item.key}
            onClick={() => void handleTabChange(item.key)}
            className={cn(
              "sf-next-rewards-tab",
              tab === item.key && "is-active",
            )}
          >
            {item.label}
          </UnifiedButton>
        ))}
      </div>

      <section className="sf-next-rewards-ledger" aria-label="返现明细">
        <h3 className="sf-next-rewards-ledger__title">返现明细</h3>
        {loading && records.length === 0 ? (
          <div className="sf-next-rewards-state" aria-busy="true">
            <Loader2 size={20} className="animate-spin" />
            <p>正在同步返现记录</p>
          </div>
        ) : error ? (
          <div className="sf-next-state-panel sf-next-rewards-state" role="alert">
            <span className="sf-next-state-panel__icon" aria-hidden>
              <CircleHelp size={21} />
            </span>
            <h2>{error}</h2>
            <p>请重新加载返现记录。</p>
            <UnifiedButton type="button" onClick={() => void loadInitial()} className="sf-next-state-panel__primary">
              重试
            </UnifiedButton>
          </div>
        ) : records.length === 0 ? (
          <div className="sf-next-state-panel sf-next-rewards-state">
            <span className="sf-next-state-panel__icon" aria-hidden>
              <Gift size={21} />
            </span>
            <h2>暂无返现记录</h2>
            <p>邀请好友付款成功或购物抵扣后，会在这里显示。</p>
            <div className="sf-next-rewards-empty-actions">
              {inviteEnabled ? (
                <UnifiedButton type="button" onClick={() => navigate("/invite")} className="sf-next-state-panel__primary">
                  去邀请好友
                </UnifiedButton>
              ) : null}
              <UnifiedButton type="button" onClick={() => navigate("/")} className="sf-next-state-panel__primary is-secondary">
                去购物
              </UnifiedButton>
            </div>
          </div>
        ) : (
          <div className="sf-next-rewards-record-groups">
            {groupedRecords.map(([monthLabel, monthRecords]) => (
              <div key={monthLabel} className="sf-next-rewards-record-group">
                <p className="sf-next-rewards-record-group__label">{monthLabel}</p>
                <div className="sf-next-rewards-record-list">
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
                          "sf-next-rewards-record",
                          orderPath ? "is-clickable" : "is-static",
                        )}
                      >
                        <div className={cn("sf-next-rewards-record__icon", positive ? THEME_ROW_ICON_POSITIVE : THEME_ROW_ICON_NEGATIVE)}>
                          {positive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                        </div>
                        <div className="sf-next-rewards-record__copy">
                          <p>
                            {formatRewardTransactionLabel(record.type, record.reason)}
                          </p>
                          <small>
                            {record.order_no ? `订单 ${record.order_no} · ` : ""}
                            {formatDateTime(record.created_at)}
                          </small>
                        </div>
                        <span className={cn("sf-next-rewards-record__amount", positive ? THEME_TEXT_SUCCESS : THEME_TEXT_DANGER)}>
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
                className="sf-next-rewards-load-more"
              >
                {loadingMore ? "加载中..." : "加载更多"}
              </UnifiedButton>
            ) : null}
          </div>
        )}
      </section>
      </StoreAccountLayout>
    </TooltipProvider>
  );
}
