import { formatDateTime } from "@/utils/formatDateTime";
﻿import { useEffect, useState } from "react";
import { ArrowLeft, Gift, TrendingUp, TrendingDown, Loader2, Wallet } from "lucide-react";
import { useGoBack } from "@/hooks/useGoBack";
import { useNavigate } from "react-router-dom";
import * as rewardService from "@/services/rewardService";
import { useLoyaltyVisibility } from "@/hooks/useLoyaltyVisibility";
import type { RewardTransaction } from "@/types/reward";
import { toast } from "sonner";
import { toastPresetQuickSuccess } from "@/utils/toastPresets";
import {
  THEME_ACCENT_HERO_ICON,
  THEME_ACCENT_HERO_LABEL,
  THEME_ACCENT_HERO_SHELL,
  THEME_ACCENT_HERO_SUBTLE,
  THEME_ACCENT_HERO_VALUE,
  THEME_ROW_ICON_NEGATIVE,
  THEME_ROW_ICON_POSITIVE,
  THEME_TEXT_DANGER,
  THEME_TEXT_SUCCESS,
} from "@/utils/themeVisuals";

export default function Rewards() {
  const goBack = useGoBack();
  const navigate = useNavigate();
  const { config: loyaltyConfig, loading: loyaltyLoading } = useLoyaltyVisibility();
  const [records, setRecords] = useState<RewardTransaction[]>([]);
  const [balance, setBalance] = useState(0);
  const [pendingAmount, setPendingAmount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [withdrawing, setWithdrawing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 20;

  const loadData = async () => {
    setLoading(true);
    setError(null);
    setPage(1);
    try {
      const [data, bal] = await Promise.all([
        rewardService.fetchRewardTransactions({ page: 1, pageSize: PAGE_SIZE }),
        rewardService.fetchRewardBalance(),
      ]);
      setRecords(data.list);
      setBalance(bal.balance);
      setPendingAmount(bal.pendingAmount);
      setHasMore(data.list.length >= PAGE_SIZE);
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
      const nextPage = page + 1;
      const data = await rewardService.fetchRewardTransactions({ page: nextPage, pageSize: PAGE_SIZE });
      setRecords((prev) => [...prev, ...data.list]);
      setPage(nextPage);
      setHasMore(data.list.length >= PAGE_SIZE);
    } catch {
      // ignore
    }
    setLoadingMore(false);
  };

  useEffect(() => {
    if (loyaltyLoading) return;
    if (loyaltyConfig && !loyaltyConfig.reward.displayEnabled) navigate("/profile", { replace: true });
  }, [loyaltyConfig, loyaltyLoading, navigate]);

  useEffect(() => {
    loadData();
  }, []);

  const handleWithdraw = async () => {
    if (balance <= 0) {
      toast.error("暂无可提现余额");
      return;
    }
    setWithdrawing(true);
    try {
      await rewardService.requestWithdraw(balance);
      toast.success("提现申请已提交", toastPresetQuickSuccess);
      loadData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "提现失败");
    } finally {
      setWithdrawing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/95 px-[var(--store-page-x)] py-3 backdrop-blur-md sm:px-4">
        <div className="mx-auto flex w-full items-center gap-3 sm:max-w-lg">
          <button onClick={goBack}>
            <ArrowLeft size={20} className="text-foreground" />
          </button>
          <h1 className="text-base font-semibold text-foreground">返现记录</h1>
        </div>
      </header>

      <main className="mx-auto w-full px-[var(--store-page-x)] py-4 sm:max-w-lg sm:px-4 sm:py-6">
        <div className={`rounded-xl p-6 text-center ${THEME_ACCENT_HERO_SHELL}`}>
          <Gift size={32} className={`mx-auto ${THEME_ACCENT_HERO_ICON}`} />
          <p className={`mt-2 ${THEME_ACCENT_HERO_LABEL} normal-case tracking-normal`}>可提现余额</p>
          <p className={`text-4xl ${THEME_ACCENT_HERO_VALUE}`}>RM {Number(balance).toFixed(2)}</p>
          {pendingAmount > 0 && <p className={`mt-1 ${THEME_ACCENT_HERO_SUBTLE}`}>待审核：RM {Number(pendingAmount).toFixed(2)}</p>}
          <button
            onClick={handleWithdraw}
            disabled={withdrawing || balance <= 0}
            className="mx-auto mt-4 flex items-center gap-2 rounded-full btn-theme-price px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg transition-all active:scale-95 disabled:opacity-60"
          >
            <Wallet size={16} />
            {withdrawing ? "提交中..." : "申请提现"}
          </button>
        </div>

        <div className="mt-6">
          <h3 className="mb-3 text-sm font-semibold text-foreground">返现明细</h3>
          {loading ? (
            <div className="flex items-center justify-center rounded-xl border border-border bg-card p-10">
              <Loader2 size={20} className="animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card p-10 text-center">
              <p className="text-sm text-muted-foreground">{error}</p>
              <button type="button" onClick={() => loadData()} className="rounded-full btn-theme-price px-5 py-2 text-sm font-semibold text-primary-foreground active:scale-95 transition-transform">重试</button>
            </div>
          ) : records.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">暂无返现记录</div>
          ) : (
            <div className="space-y-2">
              {records.map((r) => (
                <div key={r.id} className="flex items-center gap-3 rounded-xl border border-border bg-card px-[var(--store-card-x)] py-[var(--store-card-y)] sm:p-4">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-full ${Number(r.amount) >= 0 ? THEME_ROW_ICON_POSITIVE : THEME_ROW_ICON_NEGATIVE}`}>
                    {Number(r.amount) >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{r.reason || `订单 ${r.order_no || "-"}`}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{r.order_no ? `订单 ${r.order_no} · ` : ""}{formatDateTime(r.created_at)}</p>
                  </div>
                  <span className={`text-sm font-bold ${Number(r.amount) >= 0 ? THEME_TEXT_SUCCESS : THEME_TEXT_DANGER}`}>{Number(r.amount) > 0 ? "+" : ""}{Number(r.amount).toFixed(2)}</span>
                </div>
              ))}
              {hasMore && (
                <button onClick={loadMore} disabled={loadingMore} className="w-full rounded-xl border border-border bg-card py-3 text-sm text-muted-foreground hover:bg-secondary transition-colors disabled:opacity-60">
                  {loadingMore ? "加载中..." : "加载更多"}
                </button>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

