import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useMotionConfig } from "../hooks/useMotionConfig";

type FormFieldShakeProps = {
  children: ReactNode;
  shake?: boolean | number;
  className?: string;
};

function resolveShakeTransform(level: string, frame: number) {
  const x = level === "rich" ? 6 : 4;
  const frames = [-x, x, -x / 2, x / 2, 0];
  return `translate3d(${frames[frame] ?? 0}px, 0, 0)`;
}

export function FormFieldShake({ children, shake, className }: FormFieldShakeProps) {
  const { level, enabled } = useMotionConfig();
  const trigger = shake === true || (typeof shake === "number" && shake > 0);
  const key = typeof shake === "number" ? shake : trigger ? 1 : 0;
  const [frame, setFrame] = useState(4);

  useEffect(() => {
    if (!enabled || !trigger) {
      setFrame(4);
      return;
    }

    const duration = level === "rich" ? 400 : 320;
    const timers = [0, 0.22, 0.44, 0.66, 1].map((ratio, index) =>
      window.setTimeout(() => setFrame(index), duration * ratio),
    );
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [enabled, key, level, trigger]);

  return (
    <div
      className={cn(className)}
      style={{
        transform: enabled ? resolveShakeTransform(level, frame) : undefined,
        transition: enabled ? `transform ${level === "rich" ? 90 : 70}ms ease-out` : undefined,
      }}
    >
      {children}
    </div>
  );
}

export default FormFieldShake;
