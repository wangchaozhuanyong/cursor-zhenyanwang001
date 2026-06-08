import { useEffect, useRef, useState } from "react";

const VIEWPORT_SYNC_DELAY_MS = 320;

type KeyboardViewportState = {
  keyboardInset: number;
  visualViewportOffsetTop: number;
  visualViewportHeight: number;
};

/** 会唤起软键盘的控件（不含 select / checkbox 等） */
function isKeyboardTriggerField(el: Element | null): boolean {
  if (el instanceof HTMLTextAreaElement) return true;
  if (el instanceof HTMLSelectElement) return false;
  if (!(el instanceof HTMLInputElement)) return false;
  const type = (el.type || "text").toLowerCase();
  return !["checkbox", "radio", "button", "submit", "reset", "file", "hidden", "image"].includes(type);
}

function isCoarsePointerDevice(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(pointer: coarse)").matches;
}

function readKeyboardViewportState(): KeyboardViewportState {
  if (typeof window === "undefined") return { keyboardInset: 0, visualViewportOffsetTop: 0, visualViewportHeight: 0 };
  const layoutHeight = window.innerHeight || 0;
  const visualViewport = window.visualViewport;
  const visualViewportHeight = Math.max(0, Math.round(visualViewport?.height || layoutHeight));
  const visualViewportOffsetTop = Math.max(0, Math.round(visualViewport?.offsetTop || 0));
  const keyboardInset = Math.max(0, Math.round(layoutHeight - visualViewportHeight - visualViewportOffsetTop));
  return { keyboardInset, visualViewportOffsetTop, visualViewportHeight };
}

/** 迟滞阈值，避免 iOS Chrome visualViewport 微抖导致布局来回切换 */
function readKeyboardLikelyOpen(prevOpen: boolean): boolean {
  if (typeof window === "undefined" || !window.visualViewport) return false;
  const ratio = window.visualViewport.height / window.innerHeight;
  const { keyboardInset } = readKeyboardViewportState();
  return prevOpen ? ratio < 0.88 || keyboardInset > 80 : ratio < 0.72 || keyboardInset > 120;
}

/**
 * 登录等表单页：区分「文本框聚焦」与「软键盘弹起」。
 * - 桌面 Chrome：不因 visualViewport 微变收起轮播或改动底部协议区
 * - 触屏设备：软键盘稳定弹起后才压缩顶部轮播（无动画，避免闪跳）
 */
export function useFormFieldFocus(enabled = true) {
  const [textFieldFocused, setTextFieldFocused] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [viewportState, setViewportState] = useState(readKeyboardViewportState);
  const keyboardOpenRef = useRef(false);
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const viewportDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const coarsePointer = useRef(isCoarsePointerDevice());

  useEffect(() => {
    if (!enabled || typeof document === "undefined") return;
    coarsePointer.current = isCoarsePointerDevice();

    const clearBlurTimer = () => {
      if (blurTimerRef.current) {
        clearTimeout(blurTimerRef.current);
        blurTimerRef.current = null;
      }
    };

    const clearViewportDebounce = () => {
      if (viewportDebounceRef.current) {
        clearTimeout(viewportDebounceRef.current);
        viewportDebounceRef.current = null;
      }
    };

    const applyKeyboardOpen = (next: boolean) => {
      if (keyboardOpenRef.current === next) return;
      keyboardOpenRef.current = next;
      setKeyboardOpen(next);
    };

    const syncViewportState = () => {
      const next = readKeyboardViewportState();
      setViewportState((prev) => {
        if (
          Math.abs(prev.keyboardInset - next.keyboardInset) < 2
          && Math.abs(prev.visualViewportOffsetTop - next.visualViewportOffsetTop) < 2
          && Math.abs(prev.visualViewportHeight - next.visualViewportHeight) < 2
        ) {
          return prev;
        }
        return next;
      });
    };

    const syncKeyboardOpen = () => {
      syncViewportState();
      const next = readKeyboardLikelyOpen(keyboardOpenRef.current);
      applyKeyboardOpen(next);
    };

    const scheduleViewportSync = () => {
      clearViewportDebounce();
      viewportDebounceRef.current = setTimeout(() => {
        viewportDebounceRef.current = null;
        const active = document.activeElement;
        if (isKeyboardTriggerField(active)) {
          setTextFieldFocused(true);
        }
        syncKeyboardOpen();
      }, VIEWPORT_SYNC_DELAY_MS);
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
        if (!readKeyboardLikelyOpen(keyboardOpenRef.current)) applyKeyboardOpen(false);
      }, 280);
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
      scheduleViewportSync();
      if (isKeyboardTriggerField(document.activeElement)) {
        setTextFieldFocused(true);
        return;
      }
      const kb = readKeyboardLikelyOpen(keyboardOpenRef.current);
      if (isKeyboardTriggerField(document.activeElement) || kb) {
        setTextFieldFocused(true);
        return;
      }
      scheduleTextFocusedFalse();
    };

    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    window.visualViewport?.addEventListener("resize", onViewportResize);
    window.visualViewport?.addEventListener("scroll", onViewportResize);
    syncKeyboardOpen();

    return () => {
      clearBlurTimer();
      clearViewportDebounce();
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      window.visualViewport?.removeEventListener("resize", onViewportResize);
      window.visualViewport?.removeEventListener("scroll", onViewportResize);
    };
  }, [enabled]);

  const layoutCompact = keyboardOpen && coarsePointer.current;

  return {
    textFieldFocused,
    keyboardOpen,
    keyboardInset: keyboardOpen ? viewportState.keyboardInset : 0,
    visualViewportOffsetTop: keyboardOpen ? viewportState.visualViewportOffsetTop : 0,
    visualViewportHeight: viewportState.visualViewportHeight,
    /** 仅触屏 + 软键盘：收起轮播等，桌面 Chrome 不触发 */
    layoutCompact,
    /** 文本框聚焦或软键盘已弹起（用于暂停轮播） */
    formCompact: textFieldFocused || keyboardOpen,
  };
}
