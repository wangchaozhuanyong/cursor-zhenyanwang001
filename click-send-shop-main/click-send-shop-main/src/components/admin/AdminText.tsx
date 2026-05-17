import { useAdminT } from "@/hooks/useAdminT";

/** Translate inline Chinese copy in admin pages when locale is English. */
export function Tx({ children }: { children: string }) {
  const { tText } = useAdminT();
  return <>{tText(children)}</>;
}
