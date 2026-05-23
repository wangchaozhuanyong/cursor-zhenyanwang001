import { formatDateTime } from "@/utils/formatDateTime";
import { useEffect, useState } from "react";
import { Star, TrendingDown, TrendingUp, Loader2, CalendarCheck } from "lucide-react";
import { useGoBack } from "@/hooks/useGoBack";
import { useNavigate } from "react-router-dom";
import { useUserStore } from "@/stores/useUserStore";
import { usePointsStore } from "@/stores/usePointsStore";
import { fetchPointsConfig, signIn } from "@/services/pointsService";
import { useLoyaltyVisibility } from "@/hooks/useLoyaltyVisibility";
import { toast } from "sonner";
import { toastPresetQuickSuccess } from "@/utils/toastPresets";
import {
  THEME_ACCENT_HERO_ICON,
  THEME_ACCENT_HERO_LABEL,
  THEME_ACCENT_HERO_MUTED,
  THEME_ACCENT_HERO_SHELL,
  THEME_ACCENT_HERO_SUBTLE,
  THEME_ACCENT_HERO_VALUE,
  THEME_ROW_ICON_NEGATIVE,
  THEME_ROW_ICON_POSITIVE,
  THEME_TEXT_DANGER,
  THEME_TEXT_SUCCESS,
} from "@/utils/themeVisuals";
import PageHeader from "@/components/PageHeader";
import { formatPointsRecordLabel, normalizePointsHintText } from "@/utils/pointsDisplayLabels";

const POINTS_HINT_FALLBACK = "订单支付完成后，将按后台当前积分规则发放积分。";

const POINTS_ERROR_LABELS: Record<string, string> = {
  "Already signed in today": "今天已经签到过了",
  "Sign-in points rule is disabled": "每日签到积分规则已关闭",
  "daily sign-in points must be at least 1": "每日签到积分必须至少为 1",
  "Insufficient points balance": "积分余额不足",
};

function normalizePointsText(value?: string | null, action?: string | null) {
  const text = String(value || "").trim();
  if (!text) return action ? formatPointsRecordLabel({ action, description: "" }) : "";
  const fromError = POINTS_ERROR_LABELS[text];
  if (fromError) return fromError;
  return formatPointsRecordLabel({ action, description: text }) || text;
}

export default function Points() {
  const goBack = useGoBack();
  const navigate = useNavigate();
  const { pointsBalance, loadProfile } = useUserStore();
  const { records, loading, loadingMore, error, hasMore, loadPointsData, loadMore } = usePointsStore();
  const [signingIn, setSigningIn] = useState(false);
  const [pointsHint, setPointsHint] = useState<string>("");
  const [signInAward, setSignInAward] = useState<{ points: number; enabled: boolean; disabledReason?: string | null } | null>(null);

  const { config: loyaltyConfig, loading: loyaltyLoading } = useLoyaltyVisibility();

  useEffect(() => {
    if (loyaltyLoading) return;
    if (loyaltyConfig && !loyaltyConfig.points.displayEnabled) navigate("/profile", { replace: true });
  }, [loyaltyConfig, loyaltyLoading, navigate]);

  useEffect(() => {
    fetchPointsConfig()
      .then((cfg) => {
        setPointsHint(normalizePointsHintText(cfg.orderPointsHint, POINTS_HINT_FALLBACK));
        setSignInAward(cfg.signIn);
      })
      .catch(() => {
        setPointsHint(POINTS_HINT_FALLBACK);
        setSignInAward(null);
      });
  }, []);

  useEffect(() => {
    loadPointsData();
  }, [loadPointsData]);

  const handleSignIn = async () => {
    setSigningIn(true);
    try {
      const pts = await signIn();
      toast.success(`签到成功，获得 ${pts} 积分`, toastPresetQuickSuccess);
      loadProfile();
      loadPointsData();
    } catch (e) {
      toast.error(e instanceof Error ? normalizePointsText(e.message) || "签到失败" : "签到失败");
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="我的积分" onBack={goBack} />

      <main className="mx-auto w-full px-[var(--store-page-x)] py-4 sm:max-w-lg sm:px-4 sm:py-6">
        <div className={`rounded-2xl p-8 text-center ${THEME_ACCENT_HERO_SHELL}`}>
          <Star size={36} className={`mx-auto ${THEME_ACCENT_HERO_ICON}`} />
          <p className={`mt-3 ${THEME_ACCENT_HERO_LABEL} normal-case tracking-normal`}>当前积分</p>
          <p className={`store-stat-value mt-1 ${THEME_ACCENT_HERO_VALUE}`}>{pointsBalance}</p>
          <p className={`mt-3 px-2 text-xs leading-relaxed ${THEME_ACCENT_HERO_MUTED}`}>{pointsHint || POINTS_HINT_FALLBACK}</p>
          {signInAward && (
            <p className={`mt-1 ${THEME_ACCENT_HERO_SUBTLE}`}>
              {signInAward.enabled ? `每日签到可获 ${signInAward.points} 积分（与后台规则一致）` : signInAward.disabledReason || "暂时无法签到"}
            </p>
          )}
          <button
            onClick={handleSignIn}
            disabled={signingIn || (signInAward ? !signInAward.enabled : false)}
            className="mx-auto mt-4 flex items-center gap-2 rounded-full btn-theme-price px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg transition-all active:scale-95 disabled:opacity-60"
          >
            <CalendarCheck size={16} />
            {signingIn ? "签到中..." : signInAward && !signInAward.enabled ? "签到不可用" : "每日签到"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/points/gifts")}
            className="mx-auto mt-3 block text-sm font-medium text-primary underline-offset-2 hover:underline"
          >
            积分兑换礼品
          </button>
        </div>

        <div className="mt-6">
          <h3 className="mb-3 text-sm font-semibold text-foreground">积分明细</h3>
          {loading ? (
            <div className="flex items-center justify-center rounded-xl border border-border bg-card p-10">
              <Loader2 size={20} className="animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-10 text-center text-sm text-[var(--theme-danger)]">{error}</div>
          ) : records.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">暂无积分记录</div>
          ) : (
            <div className="space-y-2">
              {records.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card px-[var(--store-card-x)] py-[var(--store-card-y)] sm:p-4"
                >
                  <div className={`flex h-9 w-9 items-center justify-center rounded-full ${record.amount >= 0 ? THEME_ROW_ICON_POSITIVE : THEME_ROW_ICON_NEGATIVE}`}>
                    {record.amount >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {normalizePointsText(record.description, record.action) || "积分变动"}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{formatDateTime(record.created_at)}</p>
                  </div>
                  <span className={`text-sm font-bold ${record.amount >= 0 ? THEME_TEXT_SUCCESS : THEME_TEXT_DANGER}`}>
                    {record.amount > 0 ? "+" : ""}
                    {record.amount}
                  </span>
                </div>
              ))}
              {hasMore && (
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="w-full rounded-xl border border-border bg-card py-3 text-sm text-muted-foreground transition-colors hover:bg-secondary disabled:opacity-60"
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
