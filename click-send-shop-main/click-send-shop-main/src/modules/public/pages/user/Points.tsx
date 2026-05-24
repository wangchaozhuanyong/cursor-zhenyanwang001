import { formatDateTime } from "@/utils/formatDateTime";
import { useCallback, useEffect, useState } from "react";
import { Star, TrendingDown, TrendingUp, Loader2, CalendarCheck } from "lucide-react";
import { useGoBack } from "@/hooks/useGoBack";
import { useNavigate } from "react-router-dom";
import { useUserStore } from "@/stores/useUserStore";
import { usePointsStore } from "@/stores/usePointsStore";
import { fetchPointsConfig, signIn } from "@/services/pointsService";
import type { PointsClientConfig } from "@/api/modules/points";
import { useLoyaltyVisibility } from "@/hooks/useLoyaltyVisibility";
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
import StoreAccountLayout from "@/components/store/StoreAccountLayout";
import { formatPointsRecordLabel } from "@/utils/pointsDisplayLabels";
import { cn } from "@/lib/utils";

const POINTS_ERROR_LABELS: Record<string, string> = {
  "Already signed in today": "今天已经签到过了",
  "Sign-in points rule is disabled": "每日签到积分规则已关闭",
  "daily sign-in points must be at least 1": "每日签到积分必须至少为 1",
  "Insufficient points balance": "积分余额不足",
};

type SignInConfig = PointsClientConfig["signIn"];

function normalizePointsText(value?: string | null, action?: string | null) {
  const text = String(value || "").trim();
  if (!text) return action ? formatPointsRecordLabel({ action, description: "" }) : "";
  const fromError = POINTS_ERROR_LABELS[text];
  if (fromError) return fromError;
  return formatPointsRecordLabel({ action, description: text }) || text;
}

function signInHintText(config: SignInConfig | null, ready: boolean) {
  if (!ready) return "正在加载签到规则…";
  if (!config) return "暂时无法获取签到规则";
  if (config.enabled) return `每日签到可获 ${config.points} 积分`;
  return config.disabledReason || "暂时无法签到";
}

function PointsHeroCard({
  balance,
  signInConfig,
  configReady,
  signingIn,
  onSignIn,
  onGiftShop,
}: {
  balance: number;
  signInConfig: SignInConfig | null;
  configReady: boolean;
  signingIn: boolean;
  onSignIn: () => void;
  onGiftShop: () => void;
}) {
  const signInEnabled = configReady && Boolean(signInConfig?.enabled);
  const signInLabel = signingIn ? "签到中..." : signInEnabled ? "每日签到" : "签到不可用";

  return (
    <section className={cn("rounded-2xl px-5 py-6 sm:px-8 sm:py-7", THEME_ACCENT_HERO_SHELL)}>
      <div className="flex flex-col items-center gap-3 text-center">
        <Star size={32} className={THEME_ACCENT_HERO_ICON} aria-hidden />
        <p className={cn(THEME_ACCENT_HERO_LABEL, "normal-case tracking-normal")}>当前积分</p>
        <p className={cn("store-stat-value text-4xl leading-none sm:text-5xl", THEME_ACCENT_HERO_VALUE)}>{balance}</p>
      </div>

      <p className={cn("mt-4 text-center text-xs leading-5", THEME_ACCENT_HERO_SUBTLE)}>
        {signInHintText(signInConfig, configReady)}
      </p>

      <div className="mt-4 flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={onSignIn}
          disabled={signingIn || !signInEnabled}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full btn-theme-price px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <CalendarCheck size={16} aria-hidden />
          {signInLabel}
        </button>
        <button
          type="button"
          onClick={onGiftShop}
          className="text-sm font-medium text-primary-foreground/90 underline-offset-2 hover:underline"
        >
          积分兑换礼品
        </button>
      </div>
    </section>
  );
}

function PointsRecordRow({
  description,
  action,
  createdAt,
  amount,
}: {
  description?: string | null;
  action?: string | null;
  createdAt: string;
  amount: number;
}) {
  const positive = amount >= 0;
  const label = normalizePointsText(description, action) || "积分变动";

  return (
    <article className="flex items-start gap-3 rounded-xl border border-border bg-card px-[var(--store-card-x)] py-[var(--store-card-y)] sm:p-4">
      <div
        className={cn(
          "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
          positive ? THEME_ROW_ICON_POSITIVE : THEME_ROW_ICON_NEGATIVE,
        )}
        aria-hidden
      >
        {positive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="break-words text-sm font-medium leading-snug text-foreground">{label}</p>
        <p className="mt-1 text-[11px] leading-4 text-muted-foreground">{formatDateTime(createdAt)}</p>
      </div>
      <span
        className={cn(
          "shrink-0 pl-2 text-sm font-bold tabular-nums",
          positive ? THEME_TEXT_SUCCESS : THEME_TEXT_DANGER,
        )}
      >
        {amount > 0 ? "+" : ""}
        {amount}
      </span>
    </article>
  );
}

export default function Points() {
  const goBack = useGoBack();
  const navigate = useNavigate();
  const { pointsBalance, loadProfile } = useUserStore();
  const { balance, records, loading, loadingMore, loadMoreError, error, hasMore, loadPointsData, loadMore } =
    usePointsStore();
  const [signingIn, setSigningIn] = useState(false);
  const [signInConfig, setSignInConfig] = useState<SignInConfig | null>(null);
  const [configReady, setConfigReady] = useState(false);

  const { config: loyaltyConfig, loading: loyaltyLoading } = useLoyaltyVisibility();

  useEffect(() => {
    if (loyaltyLoading) return;
    if (loyaltyConfig && !loyaltyConfig.points.displayEnabled) navigate("/profile", { replace: true });
  }, [loyaltyConfig, loyaltyLoading, navigate]);

  const bootstrap = useCallback(async () => {
    setConfigReady(false);
    const [configResult] = await Promise.all([
      fetchPointsConfig()
        .then((cfg) => {
          setSignInConfig(cfg.signIn);
          return cfg;
        })
        .catch(() => {
          setSignInConfig(null);
          return null;
        }),
      loadPointsData(),
    ]);
    void configResult;
    setConfigReady(true);
  }, [loadPointsData]);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  const displayBalance = loading ? pointsBalance : balance;

  const handleSignIn = async () => {
    if (!configReady || !signInConfig?.enabled || signingIn) return;
    setSigningIn(true);
    try {
      const pts = await signIn();
      toast.success(`签到成功，获得 ${pts} 积分`, toastPresetQuickSuccess);
      await Promise.all([loadProfile(), loadPointsData()]);
      const cfg = await fetchPointsConfig().catch(() => null);
      if (cfg) setSignInConfig(cfg.signIn);
    } catch (e) {
      toast.error(e instanceof Error ? normalizePointsText(e.message) || "签到失败" : "签到失败");
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <StoreAccountLayout title="我的积分" onBack={goBack} mainClassName="sm:py-6 lg:py-6">
      <div className="flex flex-col gap-6">
        <PointsHeroCard
          balance={displayBalance}
          signInConfig={signInConfig}
          configReady={configReady}
          signingIn={signingIn}
          onSignIn={() => void handleSignIn()}
          onGiftShop={() => navigate("/points/gifts")}
        />

        <section className="min-w-0" aria-labelledby="points-records-heading">
          <h2 id="points-records-heading" className="mb-3 text-sm font-semibold text-foreground">
            积分明细
          </h2>

          {loading ? (
            <div className="flex items-center justify-center rounded-xl border border-border bg-card p-10">
              <Loader2 size={20} className="animate-spin text-muted-foreground" aria-label="加载中" />
            </div>
          ) : error ? (
            <div className="space-y-3 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-8 text-center">
              <p className="text-sm text-[var(--theme-danger)]">{error}</p>
              <button
                type="button"
                onClick={() => void bootstrap()}
                className="rounded-full border border-border px-5 py-2 text-sm text-foreground transition-colors hover:bg-secondary"
              >
                重试
              </button>
            </div>
          ) : records.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
              暂无积分记录
            </div>
          ) : (
            <div className="space-y-2">
              {records.map((record) => (
                <PointsRecordRow
                  key={record.id}
                  description={record.description}
                  action={record.action}
                  createdAt={record.created_at}
                  amount={record.amount}
                />
              ))}
              {loadMoreError ? (
                <p className="px-1 text-center text-xs text-[var(--theme-danger)]">{loadMoreError}</p>
              ) : null}
              {hasMore ? (
                <button
                  type="button"
                  onClick={() => void loadMore()}
                  disabled={loadingMore}
                  className="w-full rounded-xl border border-border bg-card py-3 text-sm text-muted-foreground transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loadingMore ? "加载中..." : "加载更多"}
                </button>
              ) : null}
            </div>
          )}
        </section>
      </div>
    </StoreAccountLayout>
  );
}
