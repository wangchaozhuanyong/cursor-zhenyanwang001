import { useEffect, useState } from "react";
import { ArrowLeft, Star, TrendingUp, TrendingDown, Loader2, CalendarCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useGoBack } from "@/hooks/useGoBack";
import { useUserStore } from "@/stores/useUserStore";
import { usePointsStore } from "@/stores/usePointsStore";
import { fetchPointsConfig, signIn } from "@/services/pointsService";
import { toast } from "sonner";
import { toastPresetQuickSuccess } from "@/utils/toastPresets";
import {
  THEME_ACCENT_HERO_ICON,
  THEME_ACCENT_HERO_LABEL,
  THEME_ACCENT_HERO_MUTED,
  THEME_ACCENT_HERO_SHELL,
  THEME_ACCENT_HERO_SUBTLE,
  THEME_ACCENT_HERO_VALUE,
} from "@/utils/themeVisuals";

export default function Points() {
  const navigate = useNavigate();
  const goBack = useGoBack();
  const { pointsBalance, loadProfile } = useUserStore();
  const { records, loading, loadingMore, error, hasMore, loadPointsData, loadMore } = usePointsStore();
  const [signingIn, setSigningIn] = useState(false);
  const [pointsHint, setPointsHint] = useState<string>("");
  const [signInAward, setSignInAward] = useState<{
    points: number;
    enabled: boolean;
    disabledReason?: string | null;
  } | null>(null);

  useEffect(() => {
    fetchPointsConfig()
      .then((cfg) => {
        setPointsHint(cfg.orderPointsHint || "");
        setSignInAward(cfg.signIn);
      })
      .catch(() => {
        setPointsHint("订单支付完成后，按商品所设积分累计发放");
        setSignInAward(null);
      });
  }, []);

  const handleSignIn = async () => {
    setSigningIn(true);
    try {
      const pts = await signIn();
      toast.success(`签到成功，获得 ${pts} 积分！`, toastPresetQuickSuccess);
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
          <button onClick={goBack} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-secondary touch-target">
            <ArrowLeft size={20} className="text-foreground" />
          </button>
          <h1 className="text-base font-semibold text-foreground">我的积分</h1>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-6">
        <div className={`rounded-2xl p-8 text-center ${THEME_ACCENT_HERO_SHELL}`}>
          <Star size={36} className={`mx-auto ${THEME_ACCENT_HERO_ICON}`} />
          <p className={`mt-3 ${THEME_ACCENT_HERO_LABEL} normal-case tracking-normal`}>当前积分</p>
          <p className={`mt-1 text-5xl ${THEME_ACCENT_HERO_VALUE}`}>{pointsBalance}</p>
          <p className={`mt-3 px-2 text-xs leading-relaxed ${THEME_ACCENT_HERO_MUTED}`}>
            {pointsHint || "订单支付完成后，按商品所设积分累计发放"}
          </p>
          {signInAward && (
            <p className={`mt-1 ${THEME_ACCENT_HERO_SUBTLE}`}>
              {signInAward.enabled
                ? `每日签到可获 ${signInAward.points} 积分（与后台规则一致）`
                : (signInAward.disabledReason || "暂时无法签到")}
            </p>
          )}
          <button
            onClick={handleSignIn}
            disabled={signingIn || (signInAward ? !signInAward.enabled : false)}
            className="mx-auto mt-4 flex items-center gap-2 rounded-full btn-theme-price px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg transition-all active:scale-95 disabled:opacity-60"
          >
            <CalendarCheck size={16} />
            {signingIn
              ? "签到中..."
              : signInAward && !signInAward.enabled
                ? "签到不可用"
                : "每日签到"}
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
