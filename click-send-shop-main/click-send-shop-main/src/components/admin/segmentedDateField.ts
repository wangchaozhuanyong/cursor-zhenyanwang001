import type { ClipboardEvent, RefObject } from "react";

/** 管理后台分段日期/时间：年 4 位、月/日/时/分各 2 位 */
export const SEGMENT_YEAR_LEN = 4;
export const SEGMENT_MONTH_LEN = 2;
export const SEGMENT_DAY_LEN = 2;
export const SEGMENT_HOUR_LEN = 2;
export const SEGMENT_MINUTE_LEN = 2;

export function segmentDigits(raw: string, maxLen: number): string {
  return raw.replace(/\D/g, "").slice(0, maxLen);
}

function focusSegment(nextInput: HTMLInputElement | null | undefined) {
  queueMicrotask(() => {
    nextInput?.focus();
    nextInput?.select?.();
  });
}

export function focusNextAfterYearComplete(
  year: string,
  nextInput: HTMLInputElement | null | undefined,
) {
  if (segmentDigits(year, SEGMENT_YEAR_LEN).length !== SEGMENT_YEAR_LEN) return;
  focusSegment(nextInput);
}

export function focusNextAfterMonthComplete(
  month: string,
  nextInput: HTMLInputElement | null | undefined,
) {
  if (segmentDigits(month, SEGMENT_MONTH_LEN).length !== SEGMENT_MONTH_LEN) return;
  focusSegment(nextInput);
}

export function focusNextAfterDayComplete(
  day: string,
  nextInput: HTMLInputElement | null | undefined,
) {
  if (segmentDigits(day, SEGMENT_DAY_LEN).length !== SEGMENT_DAY_LEN) return;
  focusSegment(nextInput);
}

export function focusNextAfterHourComplete(
  hour: string,
  nextInput: HTMLInputElement | null | undefined,
) {
  if (segmentDigits(hour, SEGMENT_HOUR_LEN).length !== SEGMENT_HOUR_LEN) return;
  focusSegment(nextInput);
}

export const SEGMENT_YEAR_INPUT_CLASS =
  "w-[4ch] min-w-[4ch] max-w-[4ch] tabular-nums bg-transparent text-center outline-none placeholder:text-muted-foreground disabled:opacity-50";

/** 年：仅数字、最多 4 位，满 4 位自动跳到月 */
export function applyYearSegmentInput(
  raw: string,
  monthRef: RefObject<HTMLInputElement | null>,
): string {
  const v = segmentDigits(raw, SEGMENT_YEAR_LEN);
  focusNextAfterYearComplete(v, monthRef.current);
  return v;
}

export function handleYearSegmentPaste(
  e: ClipboardEvent<HTMLInputElement>,
  monthRef: RefObject<HTMLInputElement | null>,
  onYear: (year: string) => void,
) {
  e.preventDefault();
  const v = segmentDigits(e.clipboardData.getData("text"), SEGMENT_YEAR_LEN);
  onYear(v);
  focusNextAfterYearComplete(v, monthRef.current);
}
