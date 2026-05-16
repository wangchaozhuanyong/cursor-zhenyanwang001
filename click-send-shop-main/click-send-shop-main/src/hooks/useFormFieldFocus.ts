import { useEffect, useState } from "react";

function isFormField(el: Element | null): boolean {
  return (
    el instanceof HTMLInputElement
    || el instanceof HTMLTextAreaElement
    || el instanceof HTMLSelectElement
  );
}

/** 页面内是否有表单控件获得焦点（用于键盘弹起时暂停轮播、收起占位区等） */
export function useFormFieldFocus(enabled = true) {
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!enabled || typeof document === "undefined") return;

    const onFocusIn = (e: FocusEvent) => {
      if (isFormField(e.target as Element)) setFocused(true);
    };
    const onFocusOut = () => {
      window.requestAnimationFrame(() => {
        if (!isFormField(document.activeElement)) setFocused(false);
      });
    };

    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
    };
  }, [enabled]);

  return focused;
}
