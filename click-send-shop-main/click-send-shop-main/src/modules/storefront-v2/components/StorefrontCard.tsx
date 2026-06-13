import type { ReactNode } from "react";
import { storefrontCardClassName } from "../design/classes";

type StorefrontCardProps = {
  children: ReactNode;
  className?: string;
};

export default function StorefrontCard({ children, className }: StorefrontCardProps) {
  return <div className={storefrontCardClassName(className)}>{children}</div>;
}
