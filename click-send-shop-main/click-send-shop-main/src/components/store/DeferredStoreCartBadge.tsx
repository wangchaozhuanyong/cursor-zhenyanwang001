import { lazy, Suspense, useEffect, useState } from "react";
import type { StoreCartBadgeCountProps } from "@/components/store/StoreCartBadgeCount";
import { scheduleIdleTask } from "@/utils/idleScheduler";

const StoreCartBadgeCount = lazy(() => import("@/components/store/StoreCartBadgeCount"));
const CART_BADGE_DELAY_MS = 18_000;

export default function DeferredStoreCartBadge(props: StoreCartBadgeCountProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const reveal = () => setMounted(true);
    const cancelIdle = scheduleIdleTask("cart-badge-reveal", reveal, {
      delayMs: CART_BADGE_DELAY_MS,
      timeoutMs: 5000,
      jitterMs: 2500,
    });
    window.addEventListener("cart:badge-bump", reveal);
    return () => {
      cancelIdle();
      window.removeEventListener("cart:badge-bump", reveal);
    };
  }, []);

  if (!mounted) return null;

  return (
    <Suspense fallback={null}>
      <StoreCartBadgeCount {...props} />
    </Suspense>
  );
}
