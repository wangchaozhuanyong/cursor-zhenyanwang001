import { lazy, Suspense, useEffect, useState } from "react";
import type { StoreCartBadgeCountProps } from "@/components/store/StoreCartBadgeCount";

const StoreCartBadgeCount = lazy(() => import("@/components/store/StoreCartBadgeCount"));
const CART_BADGE_DELAY_MS = 9000;

export default function DeferredStoreCartBadge(props: StoreCartBadgeCountProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const reveal = () => setMounted(true);
    const timeoutId = window.setTimeout(reveal, CART_BADGE_DELAY_MS);
    window.addEventListener("cart:badge-bump", reveal);
    return () => {
      window.clearTimeout(timeoutId);
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
