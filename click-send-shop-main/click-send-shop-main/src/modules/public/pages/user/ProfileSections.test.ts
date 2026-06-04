import { describe, expect, it } from "vitest";
import { formatProfileHeroName } from "./profileHeroName";

describe("formatProfileHeroName", () => {
  it("keeps profile hero names within four visible characters", () => {
    expect(formatProfileHeroName("测试")).toBe("测试");
    expect(formatProfileHeroName("超长用户昵称")).toBe("超长用…");
  });

  it("trims surrounding whitespace before limiting the name", () => {
    expect(formatProfileHeroName("  大马通会员  ")).toBe("大马通…");
  });
});
