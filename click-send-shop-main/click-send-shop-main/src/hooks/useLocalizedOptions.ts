import { useMemo } from "react";
import { useAdminT } from "@/hooks/useAdminT";

/** Translate option labels for select filters when locale is English. */
export function useLocalizedOptions<T extends string>(
  options: ReadonlyArray<{ value: T; label: string }>,
) {
  const { tText } = useAdminT();
  return useMemo(
    () => options.map((o) => ({ ...o, label: tText(o.label) })),
    [options, tText],
  );
}
