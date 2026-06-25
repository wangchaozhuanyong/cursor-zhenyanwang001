import { Box, CheckCircle2, RefreshCw, WifiOff } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import StoreStandardPageShell from "@/components/store/StoreStandardPageShell";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import { useThemeQrColors } from "@/hooks/useThemeQrColors";
import { usePublicLocale } from "@/i18n/publicLocale";
import { cn } from "@/lib/utils";
import RouteStatePanel from "@/modules/storefront-v2/design/components/RouteStatePanel";
import SharePassCard from "@/modules/storefront-v2/design/components/SharePassCard";
import ValueVaultCoupon, {
  type ValueVaultKind,
  type ValueVaultStatus,
} from "@/modules/storefront-v2/design/components/ValueVaultCoupon";
import StatusTimeline from "@/modules/storefront-v2/design/components/StatusTimeline";
import * as inviteService from "@/services/inviteService";
import { useCouponCenterStore } from "@/stores/useCouponCenterStore";
import { useMyCouponsStore } from "@/stores/useMyCouponsStore";
import { useUserStore } from "@/stores/useUserStore";
import type { CouponType, UserCoupon } from "@/types/coupon";
import { copyToClipboard } from "@/utils/clipboard";
import { isLoggedIn } from "@/utils/token";
import { userCouponToPremiumDisplay } from "@/utils/couponDisplay";
import { toastPresetQuickSuccess } from "@/utils/toastPresets";
import { toast } from "sonner";

type DesignRouteKind = "system" | "coupon-detail" | "share-detail" | "states";

const DESIGN_ROUTE_META: Record<DesignRouteKind, { title: string; subtitle: string }> = {
  system: {
    title: "SILENT COMMERCE",
    subtitle: "静界零售 · 移动端视觉基线",
  },
  "coupon-detail": {
    title: "Value Vault",
    subtitle: "优惠券不是促销贴纸，而是数字权益凭证。",
  },
  "share-detail": {
    title: "Share Pass",
    subtitle: "邀请页像一张会员通行证，不像裂变海报。",
  },
  states: {
    title: "状态系统",
    subtitle: "加载、空态、错误态保持同一套空间结构。",
  },
};

const sampleCoupons = [
  {
    kind: "fixed" as const,
    status: "claimable" as const,
    title: "会员专享优惠券",
    value: "20",
    meta: "满 RM 99 可用",
    validText: "有效期至 06.30",
    code: "SAVE20X8",
    actionLabel: "领取",
  },
  {
    kind: "percentage" as const,
    status: "available" as const,
    title: "精选分类折扣券",
    value: "15",
    meta: "指定商品可用",
    validText: "有效期至 07.12",
    actionLabel: "使用",
  },
  {
    kind: "shipping" as const,
    status: "locked" as const,
    title: "标准配送免运券",
    meta: "当前订单暂不满足条件",
    validText: "领取后 7 天有效",
    unavailableReason: "订单金额未达到门槛",
    actionLabel: "已领取",
  },
];

function toValueVaultKind(couponType?: CouponType): ValueVaultKind {
  if (couponType === "percentage") return "percentage";
  if (couponType === "shipping") return "shipping";
  return "fixed";
}

function toValueVaultStatus(coupon: UserCoupon): ValueVaultStatus {
  if (coupon.status === "available" && coupon.claimed_at) return "available";
  if (coupon.status === "available") return "claimable";
  if (coupon.status === "pending") return "locked";
  if (coupon.status === "invalidated" || coupon.status === "cancelled") return "invalid";
  if (coupon.status === "used" || coupon.status === "expired") return coupon.status;
  return coupon.claimed_at ? "available" : "claimable";
}

function getCouponValue(coupon: UserCoupon) {
  if (coupon.coupon?.type === "shipping") return undefined;
  const display = userCouponToPremiumDisplay(coupon);
  return display.amount.replace(/^RM\s*/i, "").replace(/%$/, "").trim();
}

function useDesignCoupons() {
  const {
    coupons: myCoupons,
    loading: myLoading,
    loadCoupons,
  } = useMyCouponsStore();
  const {
    claimableCoupons,
    loading: centerLoading,
    loadCenter,
  } = useCouponCenterStore();

  useEffect(() => {
    void loadCenter();
    void loadCoupons("available");
  }, [loadCenter, loadCoupons]);

  const coupons = myCoupons.length > 0 ? myCoupons : claimableCoupons;
  return { coupons, loading: myLoading || centerLoading };
}

function DesignShell({
  kind,
  children,
}: {
  kind: DesignRouteKind;
  children: ReactNode;
}) {
  const meta = DESIGN_ROUTE_META[kind];
  const { localizedPath } = usePublicLocale();

  return (
    <StoreStandardPageShell
      title={meta.title}
      backFallback={localizedPath("/")}
      className="sf-next-page sf-next-route-page sf-next-design-page"
      contentClassName="sf-next-design-page__main"
    >
      <div className="sf-next-design-page__intro">
        <p>{meta.subtitle}</p>
      </div>
      {children}
    </StoreStandardPageShell>
  );
}

function Swatch({ label, className }: { label: string; className: string }) {
  return (
    <div className="sf-next-design-system-swatch">
      <span className={cn("sf-next-design-system-swatch__chip", className)} />
      <span>{label}</span>
    </div>
  );
}

function SystemDesignRoute() {
  return (
    <DesignShell kind="system">
      <section className="sf-next-design-section" aria-labelledby="design-color-title">
        <h2 id="design-color-title">颜色</h2>
        <div className="sf-next-design-system-swatches">
          <Swatch label="Canvas" className="sf-next-design-system-swatch__chip--canvas" />
          <Swatch label="Surface" className="sf-next-design-system-swatch__chip--surface" />
          <Swatch label="Ink" className="sf-next-design-system-swatch__chip--ink" />
          <Swatch label="Accent" className="sf-next-design-system-swatch__chip--accent" />
          <Swatch label="Price" className="sf-next-design-system-swatch__chip--price" />
        </div>
      </section>

      <section className="sf-next-design-section" aria-labelledby="design-spacing-title">
        <h2 id="design-spacing-title">间距与线条</h2>
        <div className="sf-next-design-system-spacing">
          {[4, 8, 12, 16, 24, 32].map((size) => (
            <div key={size} className="sf-next-design-system-spacing__row">
              <span>{size}</span>
              <i style={{ width: `${size * 10}px` }} />
            </div>
          ))}
        </div>
      </section>

      <section className="sf-next-design-section" aria-labelledby="design-button-title">
        <h2 id="design-button-title">按钮层级</h2>
        <div className="sf-next-design-system-buttons">
          <UnifiedButton type="button" className="sf-next-button sf-next-button--primary">主操作</UnifiedButton>
          <UnifiedButton type="button" className="sf-next-button sf-next-button--secondary">次操作</UnifiedButton>
          <UnifiedButton type="button" className="sf-next-button sf-next-button--quiet">弱操作</UnifiedButton>
        </div>
      </section>
    </DesignShell>
  );
}

function CouponDetailDesignRoute() {
  const { coupons, loading } = useDesignCoupons();
  const liveCoupons = coupons.slice(0, 3);

  return (
    <DesignShell kind="coupon-detail">
      <div className="sf-next-design-coupon-list">
        {liveCoupons.length > 0 ? liveCoupons.map((coupon) => {
          const display = userCouponToPremiumDisplay(coupon);
          return (
            <ValueVaultCoupon
              key={coupon.id}
              kind={toValueVaultKind(coupon.coupon?.type)}
              status={toValueVaultStatus(coupon)}
              title={display.title}
              value={getCouponValue(coupon)}
              meta={display.minSpendText}
              validText={display.expireText}
              code={display.code}
              unavailableReason={coupon.invalid_reason || coupon.claim_reason}
              actionLabel={coupon.claimed_at ? "使用" : "领取"}
              onCopyCode={async (code) => {
                const copied = await copyToClipboard(code);
                if (copied) toast.success("优惠码已复制", toastPresetQuickSuccess);
              }}
            />
          );
        }) : sampleCoupons.map((coupon) => (
          <ValueVaultCoupon
            key={coupon.title}
            {...coupon}
            loading={loading && coupon.status === "claimable"}
            onCopyCode={async (code) => {
              const copied = await copyToClipboard(code);
              if (copied) toast.success("优惠码已复制", toastPresetQuickSuccess);
            }}
          />
        ))}
      </div>

      <section className="sf-next-design-section" aria-labelledby="coupon-rule-title">
        <h2 id="coupon-rule-title">状态原则</h2>
        <ul className="sf-next-design-rule-list">
          <li>价值区只承载面额或权益</li>
          <li>门槛、范围、有效期必须可读</li>
          <li>不可用原因比装饰更重要</li>
          <li>领取状态不改变卡片高度</li>
        </ul>
      </section>
    </DesignShell>
  );
}

function ShareDetailDesignRoute() {
  const { inviteCode, loadProfile } = useUserStore();
  const [copyState, setCopyState] = useState<"idle" | "loading" | "copied">("idle");
  const resetTimer = useRef<number | null>(null);
  const [recordCount, setRecordCount] = useState(0);
  const [rewardTotal, setRewardTotal] = useState(0);
  const hasAuth = isLoggedIn();
  const resolvedCode = inviteCode || "加载中";
  const inviteLink = typeof window === "undefined"
    ? ""
    : `${window.location.origin}/login?ref=${encodeURIComponent(inviteCode || "")}`;
  const serial = inviteCode ? `NO. ${inviteCode.slice(-4).toUpperCase().padStart(4, "0")}` : undefined;
  const qrColors = useThemeQrColors();

  useEffect(() => {
    if (!hasAuth) return undefined;
    void loadProfile();
    void inviteService.fetchInviteStats().then((stats) => {
      setRecordCount(Number(stats.totalInvited ?? stats.directCount ?? 0));
      setRewardTotal(Number(stats.totalReward ?? 0));
    }).catch(() => undefined);
    return () => {
      if (resetTimer.current) window.clearTimeout(resetTimer.current);
    };
  }, [hasAuth, loadProfile]);

  const copyInviteCode = useCallback(async () => {
    if (!inviteCode) {
      toast.error("邀请码加载中，请稍后");
      return;
    }
    setCopyState("loading");
    const copied = await copyToClipboard(inviteCode);
    setCopyState(copied ? "copied" : "idle");
    if (copied) {
      toast.success("邀请码已复制", toastPresetQuickSuccess);
      if (resetTimer.current) window.clearTimeout(resetTimer.current);
      resetTimer.current = window.setTimeout(() => setCopyState("idle"), 1600);
    }
  }, [inviteCode]);

  const feedback = useMemo(() => [
    { id: "01", title: copyState === "copied" ? "已复制" : "复制", description: "按钮状态变化时保持原宽度" },
    { id: "02", title: "分享", description: "底部抽屉只展示真实渠道" },
    { id: "03", title: "海报", description: "生成中保留卡片尺寸" },
    { id: "04", title: "失败", description: "局部重试，不清空邀请码" },
  ], [copyState]);

  return (
    <DesignShell kind="share-detail">
      <SharePassCard
        inviteCode={resolvedCode}
        serial={serial}
        copyState={copyState}
        disabled={!inviteCode}
        onCopyInviteCode={copyInviteCode}
        qrCode={inviteCode ? (
          <QRCodeCanvas value={inviteLink} size={132} level="H" marginSize={1} fgColor={qrColors.foreground} bgColor={qrColors.background} />
        ) : (
          <span className="sf-next-qr-waiting">等待邀请码</span>
        )}
      />

      <section className="sf-next-design-section" aria-labelledby="share-feedback-title">
        <h2 id="share-feedback-title">交互反馈</h2>
        <div className="sf-next-share-detail-feedback">
          {feedback.map((item) => (
            <article key={item.id} className="sf-next-share-detail-feedback__row">
              <span>{item.id}</span>
              <div>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="sf-next-design-section" aria-labelledby="share-data-title">
        <h2 id="share-data-title">真实数据</h2>
        <div className="sf-next-share-detail-stats">
          <span><strong>{recordCount}</strong><em>已邀请</em></span>
          <span><strong>RM {rewardTotal.toFixed(0)}</strong><em>已获得</em></span>
        </div>
      </section>
    </DesignShell>
  );
}

function StatesDesignRoute() {
  return (
    <DesignShell kind="states">
      <section className="sf-next-design-section" aria-labelledby="state-loading-title">
        <h2 id="state-loading-title">加载态</h2>
        <div className="sf-next-design-state-skeleton" aria-hidden>
          <div><i /><b /><em /></div>
          <div><i /><b /><em /></div>
        </div>
      </section>

      <section className="sf-next-design-section" aria-labelledby="state-empty-title">
        <h2 id="state-empty-title">空状态</h2>
        <RouteStatePanel
          icon={<Box size={34} aria-hidden />}
          title="这里暂时没有内容"
          description="数据出现后将保持同一布局位置"
          primaryAction={<UnifiedButton type="button" className="sf-next-button sf-next-button--primary">返回浏览</UnifiedButton>}
        />
      </section>

      <section className="sf-next-design-section" aria-labelledby="state-error-title">
        <h2 id="state-error-title">错误态</h2>
        <div className="sf-next-design-state-error" role="alert">
          <WifiOff size={22} aria-hidden />
          <strong>网络连接失败</strong>
          <UnifiedButton type="button" className="sf-next-button sf-next-button--quiet">
            <RefreshCw size={16} aria-hidden />
            重试
          </UnifiedButton>
        </div>
      </section>

      <section className="sf-next-design-section" aria-labelledby="state-timeline-title">
        <h2 id="state-timeline-title">进度状态</h2>
        <StatusTimeline
          items={[
            { id: "created", title: "请求已提交", description: "系统已记录本次操作", time: "09:41", state: "complete" },
            { id: "review", title: "正在处理", description: "保持页面结构，不闪烁", time: "现在", state: "current" },
            { id: "done", title: "完成通知", description: "结果出现后替换当前状态", state: "upcoming" },
          ]}
        />
      </section>

      <section className="sf-next-design-section" aria-labelledby="state-success-title">
        <h2 id="state-success-title">完成态</h2>
        <RouteStatePanel
          tone="success"
          icon={<CheckCircle2 size={34} aria-hidden />}
          title="操作已完成"
          description="保留下一步动作，不跳出当前上下文"
        />
      </section>
    </DesignShell>
  );
}

export function ClientDesignSystemRoute({ kind }: { kind: DesignRouteKind }) {
  if (kind === "coupon-detail") return <CouponDetailDesignRoute />;
  if (kind === "share-detail") return <ShareDetailDesignRoute />;
  if (kind === "states") return <StatesDesignRoute />;
  return <SystemDesignRoute />;
}

export function ClientDesignSystem() {
  return <ClientDesignSystemRoute kind="system" />;
}

export function ClientCouponDetailDesign() {
  return <ClientDesignSystemRoute kind="coupon-detail" />;
}

export function ClientShareDetailDesign() {
  return <ClientDesignSystemRoute kind="share-detail" />;
}

export function ClientStatesDesign() {
  return <ClientDesignSystemRoute kind="states" />;
}
