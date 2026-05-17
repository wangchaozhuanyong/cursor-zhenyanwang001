import { useAdminT } from "@/hooks/useAdminT";

/** Translate theme studio constant labels when admin locale is English. */
export function useThemeStudioLabel() {
  const { tText } = useAdminT();
  return (zh: string) => tText(zh);
}
