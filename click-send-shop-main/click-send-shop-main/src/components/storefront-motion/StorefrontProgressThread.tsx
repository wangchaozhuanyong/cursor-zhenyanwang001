import { useEffect, useState } from "react";
import { useStorefrontMotionState } from "./useStorefrontMotionState";

export default function StorefrontProgressThread() {
  const motion = useStorefrontMotionState();
  const [width, setWidth] = useState(0);
  const visible = motion.progress !== "idle";

  useEffect(() => {
    if (motion.progress === "idle") {
      setWidth(0);
      return;
    }

    if (motion.progress === "error") {
      setWidth(100);
      return;
    }

    if (motion.progress === "settling") {
      setWidth(100);
      return;
    }

    setWidth((value) => Math.max(value, 8));
    const timer = window.setInterval(() => {
      setWidth((value) => {
        if (value >= 88) return value;
        const remaining = 88 - value;
        return value + Math.max(remaining * 0.08, 0.8);
      });
    }, 180);

    return () => window.clearInterval(timer);
  }, [motion.progress, motion.sequence]);

  if (!visible) return null;

  return (
    <div
      className="sf-motion-progress-thread"
      data-state={motion.progress}
      data-phase={motion.phase}
      aria-hidden="true"
    >
      <span className="sf-motion-progress-thread__bar" style={{ width: `${width}%` }} />
    </div>
  );
}
