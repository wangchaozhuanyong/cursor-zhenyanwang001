import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  FIXED_HOME_BANNER_RECOMMENDATIONS,
  getFixedHomeBannerRecommendation,
} from "./fixedHomeBannerRecommendations";

describe("fixed home banner recommendations", () => {
  it("maps every approved production banner title to deployable mobile and desktop assets", () => {
    expect(FIXED_HOME_BANNER_RECOMMENDATIONS).toHaveLength(7);

    for (const recommendation of FIXED_HOME_BANNER_RECOMMENDATIONS) {
      expect(getFixedHomeBannerRecommendation(` ${recommendation.title} `)).toEqual(recommendation);
      for (const mediaPath of [recommendation.imageMobile, recommendation.imageDesktop]) {
        expect(mediaPath).toMatch(/^\/assets\/fixed-storefront\/.+\.webp$/);
        expect(fs.existsSync(path.resolve(process.cwd(), "public", mediaPath.slice(1)))).toBe(true);
      }
    }
  });

  it("does not guess media for an unrelated banner", () => {
    expect(getFixedHomeBannerRecommendation("临时运营活动")).toBeNull();
  });
});
