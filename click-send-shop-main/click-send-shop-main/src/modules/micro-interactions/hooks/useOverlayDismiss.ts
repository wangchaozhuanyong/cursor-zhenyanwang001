import { useEffect, useRef, type RefObject } from "react";
import { useBodyScrollLock } from "./useBodyScrollLock";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

type UseOverlayDismissOptions = {
  open: boolean;
  onClose: () => void;
  isTop?: boolean;
  closeOnEscape?: boolean;
  lockBody?: boolean;
  returnFocusRef?: RefObject<HTMLElement | null>;
  contentRef?: RefObject<HTMLElement | null>;
  autoFocus?: boolean;
  trapFocus?: boolean;
};

function getFocusableElements(root: HTMLElement | null) {
  if (!root) return [];
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((el) => {
    if (el.hasAttribute("disabled")) return false;
    if (el.getAttribute("aria-hidden") === "true") return false;
    return el.offsetParent !== null || el === document.activeElement;
  });
}

export function useOverlayDismiss({
  open,
  onClose,
  isTop = true,
  closeOnEscape = true,
  lockBody = false,
  returnFocusRef,
  contentRef,
  autoFocus = false,
  trapFocus = false,
}: UseOverlayDismissOptions) {
  const wasOpenRef = useRef(false);

  useBodyScrollLock(open && lockBody);

  useEffect(() => {
    if (!open || !isTop || !closeOnEscape) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }

      if (!trapFocus || event.key !== "Tab") return;
      const focusable = getFocusableElements(contentRef?.current ?? null);
      if (!focusable.length) {
        event.preventDefault();
        contentRef?.current?.focus({ preventScroll: true });
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus({ preventScroll: true });
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus({ preventScroll: true });
      }
    };

    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [closeOnEscape, contentRef, isTop, onClose, open, trapFocus]);

  useEffect(() => {
    if (!open || !autoFocus) return;
    const frame = window.requestAnimationFrame(() => {
      const focusable = getFocusableElements(contentRef?.current ?? null);
      (focusable[0] ?? contentRef?.current)?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [autoFocus, contentRef, open]);

  useEffect(() => {
    if (open) {
      wasOpenRef.current = true;
      return;
    }

    if (!wasOpenRef.current) return;
    wasOpenRef.current = false;
    const target = returnFocusRef?.current;
    if (!target) return;

    const frame = window.requestAnimationFrame(() => {
      target.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open, returnFocusRef]);
}
