import { useCallback, useMemo } from "react";
import { useAdminT } from "@/hooks/useAdminT";
import { labelReportCellValue, labelReportColumn } from "@/utils/adminDisplayLabels";

const CJK = /[\u4e00-\u9fff]/;

/** Localize report table/KPI labels when admin locale is English. */
export function useAdminReportLabel() {
  const { tText } = useAdminT();
  const L = useCallback((zh: string) => tText(zh), [tText]);

  return useMemo(
    () => ({
      column: (key: string) => L(labelReportColumn(key)),
      cell: (key: string, value: unknown) => {
        const raw = labelReportCellValue(key, value);
        return CJK.test(raw) ? L(raw) : raw;
      },
    }),
    [L],
  );
}
