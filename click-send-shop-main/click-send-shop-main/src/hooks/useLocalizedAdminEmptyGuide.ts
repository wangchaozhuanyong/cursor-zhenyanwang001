import { useMemo } from "react";
import {
  localizeAdminEmptyGuide,
  type AdminEmptyGuide,
} from "@/config/adminEmptyStateGuides";
import { useAdminT } from "@/hooks/useAdminT";

export function useLocalizedAdminEmptyGuide(guide: AdminEmptyGuide): AdminEmptyGuide {
  const { tText } = useAdminT();
  return useMemo(() => localizeAdminEmptyGuide(guide, tText), [guide, tText]);
}
