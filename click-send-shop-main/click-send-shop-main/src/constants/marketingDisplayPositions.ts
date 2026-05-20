import marketingDisplayData from "./marketingDisplayPositions.data.json";

export const DISPLAY_POSITIONS = marketingDisplayData.displayPositions as readonly string[];

export type DisplayPosition = (typeof DISPLAY_POSITIONS)[number];

export const DISPLAY_POSITION_LABELS: Record<DisplayPosition, string> =
  marketingDisplayData.displayPositionLabels as Record<DisplayPosition, string>;

export const PUBLISHABLE_ACTIVITY_TYPES = marketingDisplayData.publishableActivityTypes as readonly string[];
export const WIP_ACTIVITY_TYPES = marketingDisplayData.wipActivityTypes as readonly string[];

export function isValidDisplayPosition(value: unknown): value is DisplayPosition {
  return DISPLAY_POSITIONS.includes(String(value || "").trim());
}

export function normalizeDisplayPositions(list: unknown): DisplayPosition[] {
  if (!Array.isArray(list)) return [];
  return [...new Set(list.map((x) => String(x || "").trim()).filter(isValidDisplayPosition))] as DisplayPosition[];
}

export function labelDisplayPositions(positions: string[] | undefined): string {
  const normalized = normalizeDisplayPositions(positions);
  if (!normalized.length) return "--";
  return normalized.map((p) => DISPLAY_POSITION_LABELS[p] || p).join("、");
}
