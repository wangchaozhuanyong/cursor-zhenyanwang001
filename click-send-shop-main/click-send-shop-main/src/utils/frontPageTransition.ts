import { isStoreTabPath } from "@/utils/storeBottomInset";

export function shouldDisableStoreRouteTransform(pathname: string): boolean {
  return isStoreTabPath(pathname) || pathname.startsWith("/product/");
}
