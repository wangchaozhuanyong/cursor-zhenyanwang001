import type { NavigateFunction, NavigateOptions, To } from "react-router-dom";

export function navigateWithStoreTransition(
  navigate: NavigateFunction,
  to: To | number,
  options?: NavigateOptions,
) {
  if (typeof to === "number") navigate(to);
  else navigate(to, options);
}
