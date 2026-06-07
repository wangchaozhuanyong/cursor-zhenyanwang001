import { describe, expect, it } from "vitest";
import { getHomeBatchListLimit, preferNonOverlappingProducts } from "./homeProductBlocks";

const product = (id: string) => ({ id, name: id });

describe("home product block helpers", () => {
  it("keeps enough non-overlapping recommendations when the pool can fill a batch", () => {
    const result = preferNonOverlappingProducts(
      [product("hot-1"), product("rec-1"), product("rec-2"), product("rec-3")],
      new Set(["hot-1"]),
      3,
      6,
    );

    expect(result.map((item) => item.id)).toEqual(["rec-1", "rec-2", "rec-3"]);
  });

  it("backfills with overlapping products only when recommendations cannot fill one batch", () => {
    const result = preferNonOverlappingProducts(
      [product("rec-1"), product("hot-1"), product("new-1"), product("hot-2")],
      new Set(["hot-1", "hot-2", "new-1"]),
      3,
      6,
    );

    expect(result.map((item) => item.id)).toEqual(["rec-1", "hot-1", "new-1"]);
  });

  it("uses two batches as the normal member-home candidate window", () => {
    expect(getHomeBatchListLimit(12)).toBe(24);
    expect(getHomeBatchListLimit(8)).toBe(16);
  });
});
