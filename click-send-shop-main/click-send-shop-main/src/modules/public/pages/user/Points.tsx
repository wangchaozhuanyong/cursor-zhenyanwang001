import { CN_TIMEZONE, formatDateTime } from "@/utils/formatDateTime";
import { useCallback, useEffect, useState } from "react";
import {
  CalendarCheck,
  RefreshCw,
  Star,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useGoBack } from "@/hooks/useGoBack";
import { useNavigate } from "react-router-dom";
import { useUserStore } from "@/stores/useUserStore";
import { usePointsStore } from "@/stores/usePointsStore";
import { fetchPointsConfig, signIn } from "@/services/pointsService";
import type { PointsClientConfig } from "@/services/pointsService";
import { useLoyaltyVisibility } from "@/hooks/useLoyaltyVisibility";
import { toast } from "sonner";
import { toastPresetQuickSuccess } from "@/utils/toastPresets";
import {
  THEME_ROW_ICON_NEGATIVE,
  THEME_ROW_ICON_POSITIVE,
  THEME_TEXT_DANGER,
  THEME_TEXT_SUCCESS,
} from "@/utils/themeVisuals";
import StoreAccountLayout from "@/components/store/StoreAccountLayout";
import { formatPointsRecordLabel } from "@/utils/pointsDisplayLabels";
import { cn } from "@/lib/utils";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

const POINTS_ERROR_LABELS: Record<string, string> = {
  "Already signed in today": "今天已经签到过了",
  "Sign-in points rule is disabled": "每日签到积分规则已关闭",
  "daily sign-in points must be at least 1": "每日签到积分必须至少为 1",
  "Insufficient points balance": "积分余额不足",
};

type SignInConfig = PointsClientConfig["signIn"];

function formatDateKeyInChina(value: string | Date) {
  const date = value instanceof Date ? value : new Date(String(value).trim().replace(" ", "T"));
  if (Number.isNaN(date.getTime())) {
    const raw = String(value).trim();
    const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    return match ? `${match[1]}-${match[2]}-${match[3]}` : "";
  }

  const parts = new Intl.DateTimeFormat("zh-CN", {
    timeZone: CN_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const map: Partial<Record<Intl.DateTimeFormatPartTypes, string>> = {};
  for (const part of parts) {
    if (part.type !== "literal") map[part.type] = part.value;
  }
  return `${map.year}-${map.month}-${map.day}`;
}

function hasSignedInToday(records: Array<{ action?: string | null; created_at?: string | null }>) {
  const today = formatDateKeyInChina(new Date());
  return records.some((record) => {
    if (record.action !== "sign_in" || !record.created_at) return false;
    return formatDateKeyInChina(record.created_at) === today;
  });
}

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
  if (config.enabled) return `每日签到可获得 ${config.points} 积分`;
  return normalizePointsText(config.disabledReason) || "暂时无法签到";
}

function signInStatusText(config: SignInConfig | null, ready: boolean, signedInToday: boolean) {
  if (signedInToday) return "今日已签到";
  if (!ready) return "规则同步中";
  if (!config) return "规则未加载";
  if (config.enabled) return "今日可签到";
  return "暂不可签到";
}

function PointsHeroCard({
  balance,
  signInConfig,
  configReady,
  signedInToday,
  signingIn,
  onSignIn,
}: {
  balance: number;
  signInConfig: SignInConfig | null;
  configReady: boolean;
  signedInToday: boolean;
  signingIn: boolean;
  onSignIn: () => void;
}) {
  const signInEnabled = configReady && Boolean(signInConfig?.enabled) && !signedInToday;
  const signInLabel = signingIn ? "签到中..." : !configReady ? "加载中" : signedInToday ? "明天再来" : signInEnabled ? "每日签到" : "签到不可用";
  const statusText = signInStatusText(signInConfig, configReady, signedInToday);
  const rewardText = signInHintText(signInConfig, configReady);

  return (
    <section className="sf-next-folio store-points-v12-folio" aria-label="当前积分">
      <div className="sf-next-folio__topline">
        <p className="sf-next-folio__eyebrow">当前积分</p>
        <span className="sf-next-folio__status">
          <CalendarCheck size={14} aria-hidden />
          {statusText}
        </span>
      </div>
      <div className="sf-next-folio__value-row">
        <strong className="sf-next-folio__value">{balance}</strong>
        <span className="sf-next-folio__unit">PTS</span>
      </div>
      <p className="sf-next-folio__caption">{rewardText}</p>
      {!signedInToday ? (
        <p className="sf-next-folio__caption store-points-v12-folio__hint">每天一次，签到后积分会自动入账。</p>
      ) : null}

      <div className="store-points-v12-folio__actions">
        <UnifiedButton
          type="button"
          onClick={onSignIn}
          disabled={signingIn || !signInEnabled}
          className="sf-next-folio__action"
        >
          <CalendarCheck size={14} aria-hidden />
          {signInLabel}
        </UnifiedButton>
      </div>
    </section>
  );
}

function PointsRecordsLoading() {
  return (
    <div className="store-points-v12-loading-list" aria-label="积分明细加载中" aria-busy="true">
      {Array.from({ length: 4 }).map((_, index) => (
        <article key={`points-record-loading-${index}`} className="store-points-v12-loading-row" aria-hidden>
          <span className="store-points-v12-loading-row__icon" />
          <span className="store-points-v12-loading-row__body">
            <span className="store-points-v12-loading-row__line" />
            <span className="store-points-v12-loading-row__line is-short" />
          </span>
          <span className="store-points-v12-loading-row__amount" />
        </article>
      ))}
    </div>
  );
}

function PointsRecordsError({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <section className="store-account-v12-empty-panel store-points-v12-state" role="alert">
      <span className="store-account-v12-empty-panel__icon" aria-hidden>
        <Star size={28} />
      </span>
      <h2>积分记录加载失败</h2>
      <p>{error}</p>
      <UnifiedButton type="button" onClick={onRetry} className="store-account-v12-empty-panel__action">
        <RefreshCw size={17} aria-hidden />
        重试
      </UnifiedButton>
    </section>
  );
}

function PointsRecordsEmpty() {
  return (
    <section className="store-account-v12-empty-panel store-points-v12-state">
      <span className="store-account-v12-empty-panel__icon" aria-hidden>
        <Star size={28} />
      </span>
      <h2>暂无积分记录</h2>
      <p>完成签到或获得积分后，记录会显示在这里。</p>
    </section>
  );
}

function PointsRecordsFooter({ hasMore }: { hasMore: boolean }) {
  if (hasMore) return null;
  return (
    <div className="px-4 py-8 text-center text-xs text-muted-foreground">
      暂无更多记录
    </div>
  );
}

function PointsRecordsSection({
  loading,
  error,
  records,
  hasMore,
  loadingMore,
  loadMoreError,
  onRetry,
  onLoadMore,
}: {
  loading: boolean;
  error: string | null;
  records: Array<{
    id: string;
    description?: string | null;
    action?: string | null;
    created_at: string;
    amount: number;
  }>;
  hasMore: boolean;
  loadingMore: boolean;
  loadMoreError: string | null;
  onRetry: () => void;
  onLoadMore: () => void;
}) {
  return (
    <section className="min-w-0" aria-labelledby="points-records-heading">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id="points-records-heading" className="flex items-center gap-2 text-base font-semibold text-foreground">
          <span className="h-5 w-1 rounded-full bg-[var(--theme-price)]" aria-hidden />
          积分明细
        </h2>
      </div>

      {loading ? (
        <PointsRecordsLoading />
      ) : error ? (
        <PointsRecordsError error={error} onRetry={onRetry} />
      ) : records.length === 0 ? (
        <PointsRecordsEmpty />
      ) : (
        <div className="space-y-3">
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
            <UnifiedButton
              type="button"
              onClick={onLoadMore}
              disabled={loadingMore}
              className="w-full rounded-xl border border-border bg-card py-3 text-sm text-muted-foreground transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loadingMore ? "加载中..." : "加载更多"}
            </UnifiedButton>
          ) : (
            <PointsRecordsFooter hasMore={hasMore} />
          )}
        </div>
      )}
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

  const signedInToday = hasSignedInToday(records);
  const displayBalance = loading ? pointsBalance : balance;

  const handleSignIn = async () => {
    if (!configReady || !signInConfig?.enabled || signedInToday || signingIn) return;
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
    <StoreAccountLayout
      title="我的积分"
      onBack={goBack}
      className="sf-next-page store-v12-page store-account-subpage-v12-page store-points-v12-page"
      mainClassName="sf-next-account-main sm:py-6 xl:py-6"
    >
      <div className="store-points-v12-stack flex flex-col gap-6">
        <PointsHeroCard
          balance={displayBalance}
          signInConfig={signInConfig}
          configReady={configReady}
          signedInToday={signedInToday}
          signingIn={signingIn}
          onSignIn={() => void handleSignIn()}
        />

        <PointsRecordsSection
          loading={loading && records.length === 0}
          error={error}
          records={records}
          hasMore={hasMore}
          loadingMore={loadingMore}
          loadMoreError={loadMoreError}
          onRetry={() => void bootstrap()}
          onLoadMore={() => void loadMore()}
        />
      </div>
    </StoreAccountLayout>
  );
}
