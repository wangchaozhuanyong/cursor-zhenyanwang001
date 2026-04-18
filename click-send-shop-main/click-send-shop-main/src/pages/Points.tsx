import { useEffect, useState } from "react";
import { ArrowLeft, Star, TrendingUp, TrendingDown, Loader2, CalendarCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useUserStore } from "@/stores/useUserStore";
import { usePointsStore } from "@/stores/usePointsStore";
import { signIn } from "@/services/pointsService";
import { toast } from "sonner";

export default function Points() {
  const navigate = useNavigate();
  const { pointsBalance, loadProfile } = useUserStore();
  const { records, loading, loadingMore, error, hasMore, loadPointsData, loadMore } = usePointsStore();
  const [signingIn, setSigningIn] = useState(false);

  const handleSignIn = async () => {
    setSigningIn(true);
    try {
      const pts = await signIn();
      toast.success(`签到成功，获得 ${pts} 积分！`);
      loadProfile();
      loadPointsData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "签到失败");
    } finally {
      setSigningIn(false);
    }
  };

  useEffect(() => {
    loadPointsData();
  }, [loadPointsData]);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/95 px-4 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <button onClick={() => navigate(-1)} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-secondary touch-target">
            <ArrowLeft size={20} className="text-foreground" />
          </button>
          <h1 className="text-base font-semibold text-foreground">我的积分</h1>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-6">
        <div className="rounded-2xl bg-primary p-8 text-center">
          <Star size={36} className="mx-auto text-gold" />
          <p className="mt-3 text-xs text-primary-foreground/70">当前积分</p>
          <p className="mt-1 text-5xl font-bold text-gold">{pointsBalance}</p>
          <p className="mt-3 text-xs text-primary-foreground/60">1 元 = 1 积分 · 消费即赠</p>
          <button
            onClick={handleSignIn}
            disabled={signingIn}
            className="mx-auto mt-4 flex items-center gap-2 rounded-full bg-gold px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg transition-all active:scale-95 disabled:opacity-60"
          >
            <CalendarCheck size={16} />
            {signingIn ? "签到中..." : "每日签到"}
          </button>
        </div>

        <div className="mt-6">
          <h3 className="mb-3 text-sm font-semibold text-foreground">积分明细</h3>
          {loading ? (
            <div className="flex items-center justify-center rounded-xl border border-border bg-card p-10">
              <Loader2 size={20} className="animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="rounded-xl border border-border bg-card p-10 text-center text-sm text-destructive">
              {error}
            </div>
          ) : records.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
              暂无积分记录
            </div>
          ) : (
            <div className="space-y-2">
              {records.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card p-4"
                >
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-full ${
                      record.amount >= 0
                        ? "bg-green-500/10 text-green-500"
                        : "bg-destructive/10 text-destructive"
                    }`}
                  >
                    {record.amount >= 0 ? (
                      <TrendingUp size={16} />
                    ) : (
                      <TrendingDown size={16} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {record.description}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {new Date(record.created_at).toLocaleDateString("zh-CN")}
                    </p>
                  </div>
                  <span
                    className={`text-sm font-bold ${
                      record.amount >= 0 ? "text-green-500" : "text-destructive"
                    }`}
                  >
                    {record.amount > 0 ? "+" : ""}
                    {record.amount}
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
