import { useEffect, useRef } from "react";

let lockCount = 0;
let previousOverflow = "";

function lockBody() {
  if (typeof document === "undefined") return;
  if (lockCount === 0) {
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  lockCount += 1;
}

function unlockBody() {
  if (typeof document === "undefined") return;
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    document.body.style.overflow = previousOverflow;
    previousOverflow = "";
  }
}

/** 打开浮层时锁定 body 滚动，支持多层嵌套计数 */
export function useBodyScrollLock(active: boolean) {
  const wasActive = useRef(false);

  useEffect(() => {
    if (active && !wasActive.current) {
      lockBody();
      wasActive.current = true;
    }
    if (!active && wasActive.current) {
      unlockBody();
      wasActive.current = false;
    }
    return () => {
      if (wasActive.current) {
        unlockBody();
        wasActive.current = false;
      }
    };
  }, [active]);
}
