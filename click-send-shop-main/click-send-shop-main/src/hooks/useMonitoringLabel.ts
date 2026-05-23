import { useCallback, useMemo } from "react";
import { useAdminT } from "@/hooks/useAdminT";
import {
  formatCronScheduleLabel,
  formatMonitoringEntityRef,
  formatMonitoringEntityTypeLabel,
  formatMonitoringModuleLabel,
  formatMonitoringRootCause,
  formatMonitoringRuleDescription,
  formatMonitoringRuleLabel,
  formatMonitoringRunTypeLabel,
  formatMonitoringSeverityLabel,
  formatMonitoringStatusLabel,
} from "@/modules/admin/pages/monitoring/monitoringLabels";

/** Localize monitoring label helpers when admin locale is English. */
export function useMonitoringLabel() {
  const { tText } = useAdminT();
  const L = useCallback((zh: string) => tText(zh), [tText]);

  return useMemo(
    () => ({
      rule: (code?: string | null, title?: string | null) =>
        L(formatMonitoringRuleLabel(code, title)),
      ruleDescription: (code?: string | null, description?: string | null) =>
        L(formatMonitoringRuleDescription(code, description)),
      module: (module?: string | null) => L(formatMonitoringModuleLabel(module)),
      entityType: (entityType?: string | null) =>
        L(formatMonitoringEntityTypeLabel(entityType)),
      entityRef: (entityType?: string | null, entityId?: string | null) =>
        L(formatMonitoringEntityRef(entityType, entityId)),
      rootCause: (message?: string | null, code?: string | null) =>
        L(formatMonitoringRootCause(message, code)),
      severity: (value?: string | null) => L(formatMonitoringSeverityLabel(value)),
      status: (value?: string | null) => L(formatMonitoringStatusLabel(value)),
      runType: (value?: string | null) => L(formatMonitoringRunTypeLabel(value)),
      cron: (cron?: string | null) => L(formatCronScheduleLabel(cron)),
    }),
    [L],
  );
}
