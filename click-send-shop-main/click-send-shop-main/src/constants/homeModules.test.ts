import { describe, expect, it } from "vitest";
import {
  HOME_MODULE_DEFINITIONS,
  getHomeModuleCustomTitle,
  getHomeModuleTitle,
  mergeHomeModuleSettings,
} from "./homeModules";

describe("home module title settings", () => {
  it("keeps custom client titles and trims whitespace", () => {
    const settings = mergeHomeModuleSettings({
      titles: {
        new_arrivals: "  本周新品  ",
        hot_sales: "",
      },
    });

    expect(getHomeModuleCustomTitle(settings, "new_arrivals")).toBe("本周新品");
    expect(getHomeModuleTitle(settings, "hot_sales", "今日热销")).toBe("今日热销");
  });

  it("ignores unknown title keys and overlong titles", () => {
    const settings = mergeHomeModuleSettings({
      titles: {
        recommend: "A".repeat(60),
        not_a_module: "should be ignored",
      } as Record<string, string>,
    });

    expect(getHomeModuleCustomTitle(settings, "recommend")).toHaveLength(40);
    expect(Object.prototype.hasOwnProperty.call(settings.titles, "not_a_module")).toBe(false);
  });

  it("exposes a single storefront coupon module switch", () => {
    const couponDefinitions = HOME_MODULE_DEFINITIONS.filter((def) => def.key.includes("coupon") || def.key.includes("gift"));

    expect(couponDefinitions.map((def) => def.key)).toEqual(["coupon_center"]);
    expect(couponDefinitions[0].label).toBe("优惠券模块");
  });
});
