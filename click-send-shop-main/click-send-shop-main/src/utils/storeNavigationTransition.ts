import { startTransition } from "react";
import type { NavigateFunction, NavigateOptions, To } from "react-router-dom";
import { rememberCurrentStoreScrollPosition } from "@/utils/storeScrollRestoration";

export function navigateWithStoreTransition(
  navigate: NavigateFunction,
  to: To | number,
  options?: NavigateOptions,
) {
  rememberCurrentStoreScrollPosition();
  startTransition(() => {
    if (typeof to === "number") navigate(to);
    else navigate(to, options);
  });
}
