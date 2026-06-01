import type { NavigateFunction, NavigateOptions, To } from "react-router-dom";

type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void) => { finished?: Promise<void> };
};

function shouldReduceMotion() {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function markTransitioning() {
  const root = document.documentElement;
  root.classList.add("store-view-transitioning");
  window.setTimeout(() => root.classList.remove("store-view-transitioning"), 380);
}

export function navigateWithStoreTransition(
  navigate: NavigateFunction,
  to: To | number,
  options?: NavigateOptions,
) {
  if (typeof document === "undefined" || shouldReduceMotion()) {
    if (typeof to === "number") navigate(to);
    else navigate(to, options);
    return;
  }

  const doc = document as ViewTransitionDocument;
  if (!doc.startViewTransition || typeof to === "number") {
    if (typeof to === "number") navigate(to);
    else navigate(to, options);
    return;
  }

  markTransitioning();
  const transition = doc.startViewTransition(() => {
    navigate(to, options);
  });
  void transition.finished?.finally(() => {
    document.documentElement.classList.remove("store-view-transitioning");
  });
}
