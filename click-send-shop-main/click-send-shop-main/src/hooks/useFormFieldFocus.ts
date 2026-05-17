import { useEffect, useRef, useState } from "react";

function isFormField(el: Element | null): boolean {
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) return true;
  if (!(el instanceof HTMLInputElement)) return false;
  const type = (el.type || "text").toLowerCase();
  return !["checkbox", "radio", "button", "submit", "reset", "file", "hidden", "image"].includes(type);
}

function isSoftKeyboardLikelyOpen(): boolean {
  if (typeof window === "undefined" || !window.visualViewport) return false;
  return window.visualViewport.height < window.innerHeight * 0.82;
}

/** 页面内是否有表单控件获得焦点（用于键盘弹起时暂停轮播、收起占位区等） */
export function useFormFieldFocus(enabled = true) {
  const [focused, setFocused] = useState(false);
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled || typeof document === "undefined") return;

    const clearBlurTimer = () => {
      if (blurTimerRef.current) {
        clearTimeout(blurTimerRef.current);
        blurTimerRef.current = null;
      }
    };

    const setFocusedTrue = () => {
      clearBlurTimer();
      setFocused(true);
    };

    const scheduleFocusedFalse = () => {
      clearBlurTimer();
      blurTimerRef.current = setTimeout(() => {
        blurTimerRef.current = null;
        if (isFormField(document.activeElement)) return;
        if (isSoftKeyboardLikelyOpen()) return;
        setFocused(false);
      }, 220);
    };

    const onFocusIn = (e: FocusEvent) => {
      if (isFormField(e.target as Element)) setFocusedTrue();
    };
    const onFocusOut = (e: FocusEvent) => {
      const next = e.relatedTarget as Element | null;
      if (isFormField(next)) return;
      scheduleFocusedFalse();
    };

    const onViewportResize = () => {
      if (isFormField(document.activeElement) || isSoftKeyboardLikelyOpen()) {
        setFocusedTrue();
        return;
      }
      scheduleFocusedFalse();
    };

    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    window.visualViewport?.addEventListener("resize", onViewportResize);
    return () => {
      clearBlurTimer();
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      window.visualViewport?.removeEventListener("resize", onViewportResize);
    };
  }, [enabled]);

  return focused;
}
