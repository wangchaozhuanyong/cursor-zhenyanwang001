import { useEffect, useState } from "react";
import { ArrowLeft, Gift, TrendingUp, TrendingDown, Loader2, Wallet } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useGoBack } from "@/hooks/useGoBack";
import * as rewardService from "@/services/rewardService";
import type { RewardTransaction } from "@/types/reward";
import { toast } from "sonner";

export default function Rewards() {
  const navigate = useNavigate();
  const goBack = useGoBack();
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
    } catch { /* ignore */ }
    setLoadingMore(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleWithdraw = async () => {
    if (balance <= 0) { toast.error("暂无可提现余额"); return; }
    setWithdrawing(true);
    try {
      await rewardService.requestWithdraw(balance);
      toast.success("提现申请已提交");
      loadData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "提现失败");
    } finally {
      setWithdrawing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/95 px-4 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <button onClick={goBack}>
            <ArrowLeft size={20} className="text-foreground" />
          </button>
          <h1 className="text-base font-semibold text-foreground">返现记录</h1>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-6">
        <div className="rounded-xl bg-primary p-6 text-center">
          <Gift size={32} className="mx-auto text-gold" />
          <p className="mt-2 text-xs text-primary-foreground/70">可提现余额</p>
          <p className="text-4xl font-bold text-gold">RM {balance}</p>
          {pendingAmount > 0 && (
            <p className="mt-1 text-xs text-primary-foreground/50">待审核：RM {pendingAmount}</p>
          )}
          <button
            onClick={handleWithdraw}
            disabled={withdrawing || balance <= 0}
            className="mx-auto mt-4 flex items-center gap-2 rounded-full bg-gold px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg transition-all active:scale-95 disabled:opacity-60"
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
              <button
                type="button"
                onClick={() => loadData()}
                className="rounded-full bg-gold px-5 py-2 text-sm font-semibold text-primary-foreground active:scale-95 transition-transform"
              >
                重试
              </button>
            </div>
          ) : records.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
              暂无返现记录
            </div>
          ) : (
            <div className="space-y-2">
              {records.map((r) => (
                <div key={r.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-full ${Number(r.amount) >= 0 ? "bg-green-500/10 text-green-500" : "bg-destructive/10 text-destructive"}`}>
                    {Number(r.amount) >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{r.reason || `订单 ${r.order_no || "—"}`}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {r.order_no ? `订单 ${r.order_no} · ` : ""}{new Date(r.created_at).toLocaleDateString("zh-CN")}
                    </p>
                  </div>
                  <span className={`text-sm font-bold ${Number(r.amount) >= 0 ? "text-green-500" : "text-destructive"}`}>
                    {Number(r.amount) > 0 ? "+" : ""}{Number(r.amount).toFixed(2)}
                  </span>
                </div>
              ))}
              {hasMore && (
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="w-full rounded-xl border border-border bg-card py-3 text-sm text-muted-foreground hover:bg-secondary transition-colors disabled:opacity-60"
                >
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
