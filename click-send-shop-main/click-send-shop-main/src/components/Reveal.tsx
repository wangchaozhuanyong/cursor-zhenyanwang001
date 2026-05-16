import type { HTMLAttributes, ReactNode } from "react";
import { AnimatedSection } from "@/modules/micro-interactions";

type RevealProps = HTMLAttributes<HTMLDivElement> & {
  index?: number;
  children: ReactNode;
};

/** @deprecated Prefer AnimatedSection from micro-interactions */
export default function Reveal({
  index = 0,
  children,
  className = "",
  ...rest
}: RevealProps) {
  return (
    <AnimatedSection as="div" delay={index * 0.06} className={className} {...rest}>
      {children}
    </AnimatedSection>
  );
}
