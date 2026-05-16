import { useEffect, useState } from "react";

const MQ = "(max-width: 767px)";

/** 与 Tailwind md 断点对齐：移动端用 Bottom Sheet，桌面用居中 Dialog */
export function useMediaSheetMode(): boolean {
  const [mobile, setMobile] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(MQ).matches : true,
  );

  useEffect(() => {
    const mq = window.matchMedia(MQ);
    const onChange = () => setMobile(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return mobile;
}
