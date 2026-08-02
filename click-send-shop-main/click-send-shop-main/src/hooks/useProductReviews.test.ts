import { describe, expect, it } from "vitest";
import { resolveProductReviewAverage } from "./useProductReviews";

describe("resolveProductReviewAverage", () => {
  it("returns zero when there are no reviews even if the API reports a stale average", () => {
    expect(resolveProductReviewAverage({ total: 0, avg_rating: 5 })).toBe(0);
  });

  it("preserves the API average when real reviews exist", () => {
    expect(resolveProductReviewAverage({ total: 3, avg_rating: 4.2 })).toBe(4.2);
  });
});
