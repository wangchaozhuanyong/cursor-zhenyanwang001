import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { upsertMetaByName } from "@/utils/seo";

const NOINDEX_NOFOLLOW_PATTERNS = [
  /^\/admin(\/|$)/,
  /^\/login(\/|$)/,
  /^\/register(\/|$)/,
  /^\/cart(\/|$)/,
  /^\/checkout(\/|$)/,
  /^\/profile(\/|$)/,
  /^\/orders(\/|$)/,
  /^\/settings(\/|$)/,
  /^\/invite(\/|$)/,
  /^\/points(\/|$)/,
  /^\/rewards(\/|$)/,
  /^\/address(\/|$)/,
  /^\/coupons(\/|$)/,
  /^\/notifications(\/|$)/,
  /^\/returns(\/|$)/,
  /^\/reviews\/pending(\/|$)/,
  /^\/history(\/|$)/,
  /^\/favorites(\/|$)/,
];

const NOINDEX_FOLLOW_PATTERNS = [
  /^\/search(\/|$)/,
];

export default function RouteSeoGuard() {
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname;
    if (NOINDEX_NOFOLLOW_PATTERNS.some((re) => re.test(path))) {
      upsertMetaByName("robots", "noindex,nofollow");
      return;
    }
    if (NOINDEX_FOLLOW_PATTERNS.some((re) => re.test(path))) {
      upsertMetaByName("robots", "noindex,follow");
    }
  }, [location.pathname]);

  return null;
}
