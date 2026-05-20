import type { ReturnStatus } from "@/types/return";
import { RETURN_STATUS } from "@/constants/statusDictionary";

const TERMINAL_RETURN_STATUSES = new Set<ReturnStatus>([
  RETURN_STATUS.REJECTED,
  RETURN_STATUS.REFUNDED,
  RETURN_STATUS.COMPLETED,
  RETURN_STATUS.CANCELLED,
]);

export function isActiveReturnStatus(status: string): boolean {
  return !TERMINAL_RETURN_STATUSES.has(status as ReturnStatus);
}

export function countActiveReturns(list: { status: string }[]): number {
  return list.filter((r) => isActiveReturnStatus(r.status)).length;
}
