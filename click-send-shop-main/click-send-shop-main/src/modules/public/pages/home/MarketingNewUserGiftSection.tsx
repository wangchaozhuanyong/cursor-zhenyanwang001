import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Gift } from "lucide-react";
import PremiumCouponCard from "@/components/PremiumCouponCard";
import { isLoggedIn } from "@/utils/token";
import { marketingCouponToPremiumDisplay } from "@/utils/couponDisplay";
import * as marketingService from "@/services/marketingService";
import * as homeService from "@/services/homeService";
import {
  THEME_GIFT_BADGE_SHELL,
  THEME_INVITE_PROMO_CTA,
  THEME_INVITE_PROMO_MUTED,
  THEME_INVITE_PROMO_SHELL,
} from "@/utils/themeVisuals";
import { AnimatedSection } from "@/modules/micro-interactions";

export default function MarketingNewUserGiftSection({ delay = 0 }: { delay?: number }) {
  const navigate = useNavigate();
  const [payload, setPayload] = useState<Awaited<ReturnType<typeof marketingService.fetchNewUserGift>>>(null);

  useEffect(() => {
    let cancelled = false;
    const cached = homeService.getCachedHomeBootstrap();
    if (cached?.marketing?.newUserGift) {
      setPayload(cached.marketing.newUserGift as Awaited<ReturnType<typeof marketingService.fetchNewUserGift>>);
    }
    homeService.fetchHomeBootstrap().then((bootstrap) => {
      if (cancelled) return;
      if (bootstrap?.marketing?.newUserGift) {
        setPayload(bootstrap.marketing.newUserGift as Awaited<ReturnType<typeof marketingService.fetchNewUserGift>>);
        return;
      }
      return marketingService.fetchNewUserGift().then((data) => {
        if (!cancelled) setPayload(data);
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!payload?.coupons?.length) return null;

  return (
    <AnimatedSection delay={delay}>
    <section className="w-full">
      <div className={`mb-3 rounded-2xl p-4 ${THEME_INVITE_PROMO_SHELL}`}>
        <div className="flex items-start gap-3">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${THEME_GIFT_BADGE_SHELL}`}>
            <Gift size={22} className="text-[var(--theme-gift-badge-foreground)]" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="store-section-title text-[var(--theme-invite-promo-foreground)]">
              {payload.activity.title || "新人礼包"}
            </h2>
            <p className={`mt-1 text-xs ${THEME_INVITE_PROMO_MUTED}`}>
              {payload.activity.subtitle || `注册即领 ${payload.coupons.length} 张优惠券`}
            </p>
            {!isLoggedIn() ? (
              <button
                type="button"
                onClick={() => navigate("/register")}
                className={`mt-3 rounded-full px-4 py-2 ${THEME_INVITE_PROMO_CTA}`}
              >
                注册领取礼包
              </button>
            ) : (
              <p className={`mt-3 text-xs ${THEME_INVITE_PROMO_MUTED}`}>新人注册礼包已自动发放至“我的优惠券”。</p>
            )}
          </div>
        </div>
      </div>

      <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1">
        {payload.coupons.map((c) => {
          const display = marketingCouponToPremiumDisplay(c);
          return (
            <div key={c.id} className="w-[min(88vw,320px)] shrink-0 snap-center">
              <PremiumCouponCard
                colorScheme="invite"
                layout="home"
                title={display.title}
                amountPrefix={display.amountPrefix}
                amount={display.amount}
                minSpendText={display.minSpendText}
                expireText={display.expireText}
                scopeText="新人专享"
                actionLabel={!isLoggedIn() ? "注册领" : undefined}
                onAction={!isLoggedIn() ? () => navigate("/register") : undefined}
              />
            </div>
          );
        })}
      </div>
    </section>
    </AnimatedSection>
  );
}
