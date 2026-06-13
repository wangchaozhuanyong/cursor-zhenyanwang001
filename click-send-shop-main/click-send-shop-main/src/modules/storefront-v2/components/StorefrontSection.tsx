import type { ReactNode } from "react";
import { storefrontSectionClassName } from "../design/classes";

type StorefrontSectionProps = {
  children: ReactNode;
  className?: string;
};

export default function StorefrontSection({ children, className }: StorefrontSectionProps) {
  return <section className={storefrontSectionClassName(className)}>{children}</section>;
}
