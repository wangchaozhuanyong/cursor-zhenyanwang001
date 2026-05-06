import type { ReactNode } from "react";
import { useScrollReveal } from "@/hooks/useScrollReveal";

type RevealProps = {
  index?: number;
  children: ReactNode;
  className?: string;
};

export default function Reveal({
  index = 0,
  children,
  className = "",
}: RevealProps) {
  const { ref, revealed } = useScrollReveal({
    threshold: 0.1,
    delayMs: index * 100,
    once: true,
  });

  const motionClass = revealed
    ? "opacity-100 translate-y-0 scale-100"
    : "opacity-0 translate-y-5 scale-[0.96]";

  return (
    <div
      ref={ref}
      className={`will-change-transform will-change-opacity transition-[opacity,transform] duration-700 ${motionClass} ${className}`}
      style={{ transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)" }}
    >
      {children}
    </div>
  );
}
