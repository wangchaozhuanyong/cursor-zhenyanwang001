import { describe, expect, it } from "vitest";

import { getNextVisibleCount, hasMorePaginatedItems } from "./pagination";

describe("pagination", () => {
  it("loads until total count, not hardcoded max", () => {
    let visible = 24;
    const total = 108;
    const pageSize = 24;

    visible = getNextVisibleCount({ current: visible, pageSize, total });
    expect(visible).toBe(48);

    visible = getNextVisibleCount({ current: visible, pageSize, total });
    expect(visible).toBe(72);

    visible = getNextVisibleCount({ current: visible, pageSize, total });
    expect(visible).toBe(96);

    visible = getNextVisibleCount({ current: visible, pageSize, total });
    expect(visible).toBe(108);

    visible = getNextVisibleCount({ current: visible, pageSize, total });
    expect(visible).toBe(108);
  });

  it("does not stop at 48 or 60 when total is larger", () => {
    expect(getNextVisibleCount({ current: 48, pageSize: 24, total: 108 })).toBe(72);
    expect(getNextVisibleCount({ current: 60, pageSize: 24, total: 108 })).toBe(84);
  });

  it("uses total count before ending paginated lists", () => {
    expect(hasMorePaginatedItems({ loadedCount: 48, total: 108, page: 2, totalPages: 5 })).toBe(true);
    expect(hasMorePaginatedItems({ loadedCount: 108, total: 108, page: 5, totalPages: 5 })).toBe(false);
  });
});
