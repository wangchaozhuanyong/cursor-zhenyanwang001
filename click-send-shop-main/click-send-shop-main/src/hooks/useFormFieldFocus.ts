import { useEffect, useRef, useState } from "react";

/** 会唤起软键盘的控件（不含 select / checkbox 等） */
function isKeyboardTriggerField(el: Element | null): boolean {
  if (el instanceof HTMLTextAreaElement) return true;
  if (el instanceof HTMLSelectElement) return false;
  if (!(el instanceof HTMLInputElement)) return false;
  const type = (el.type || "text").toLowerCase();
  return !["checkbox", "radio", "button", "submit", "reset", "file", "hidden", "image"].includes(type);
}

export function isSoftKeyboardLikelyOpen(): boolean {
  if (typeof window === "undefined" || !window.visualViewport) return false;
  return window.visualViewport.height < window.innerHeight * 0.82;
}

/**
 * 登录等表单页：区分「文本框聚焦」与「软键盘弹起」。
 * - 国家代码 select 仅聚焦不会收起顶部轮播
 * - 手机号/密码等输入唤起键盘时才收起轮播并压缩布局
 */
export function useFormFieldFocus(enabled = true) {
  const [textFieldFocused, setTextFieldFocused] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled || typeof document === "undefined") return;

    const clearBlurTimer = () => {
      if (blurTimerRef.current) {
        clearTimeout(blurTimerRef.current);
        blurTimerRef.current = null;
      }
    };

    const syncKeyboardOpen = () => {
      setKeyboardOpen(isSoftKeyboardLikelyOpen());
    };

    const setTextFocusedTrue = () => {
      clearBlurTimer();
      setTextFieldFocused(true);
      syncKeyboardOpen();
    };

    const scheduleTextFocusedFalse = () => {
      clearBlurTimer();
      blurTimerRef.current = setTimeout(() => {
        blurTimerRef.current = null;
        if (isKeyboardTriggerField(document.activeElement)) return;
        setTextFieldFocused(false);
        syncKeyboardOpen();
        if (!isSoftKeyboardLikelyOpen()) setKeyboardOpen(false);
      }, 220);
    };

    const onFocusIn = (e: FocusEvent) => {
      if (isKeyboardTriggerField(e.target as Element)) setTextFocusedTrue();
    };
    const onFocusOut = (e: FocusEvent) => {
      const next = e.relatedTarget as Element | null;
      if (isKeyboardTriggerField(next)) return;
      scheduleTextFocusedFalse();
    };

    const onViewportResize = () => {
      const kb = isSoftKeyboardLikelyOpen();
      setKeyboardOpen(kb);
      if (isKeyboardTriggerField(document.activeElement) || kb) {
        setTextFieldFocused(true);
        return;
      }
      scheduleTextFocusedFalse();
    };

    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    window.visualViewport?.addEventListener("resize", onViewportResize);
    syncKeyboardOpen();
    return () => {
      clearBlurTimer();
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      window.visualViewport?.removeEventListener("resize", onViewportResize);
    };
  }, [enabled]);

  return {
    textFieldFocused,
    keyboardOpen,
    /** 文本框聚焦或软键盘已弹起（用于暂停轮播、收紧间距） */
    formCompact: textFieldFocused || keyboardOpen,
  };
}
