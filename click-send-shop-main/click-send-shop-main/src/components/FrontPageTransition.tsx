import type { ReactNode } from "react";
import { AnimatedPage } from "@/modules/micro-interactions";

/** @deprecated Use AnimatedPage from micro-interactions */
export default function FrontPageTransition({ children }: { children: ReactNode }) {
  return <AnimatedPage>{children}</AnimatedPage>;
}
