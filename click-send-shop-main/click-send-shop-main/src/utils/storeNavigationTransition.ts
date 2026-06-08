import type { NavigateFunction, NavigateOptions, To } from "react-router-dom";
import { rememberCurrentStoreScrollPosition } from "@/utils/storeScrollRestoration";

export function navigateWithStoreTransition(
  navigate: NavigateFunction,
  to: To | number,
  options?: NavigateOptions,
) {
  rememberCurrentStoreScrollPosition();
  if (typeof to === "number") navigate(to);
  else navigate(to, options);
}
