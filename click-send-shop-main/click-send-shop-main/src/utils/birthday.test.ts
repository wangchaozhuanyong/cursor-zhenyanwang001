import { describe, expect, it } from "vitest";
import { normalizeBirthdayValue, resolveBirthdayLockedState } from "./birthday";

describe("normalizeBirthdayValue", () => {
  it("接受标准 YYYY-MM-DD", () => {
    expect(normalizeBirthdayValue("1990-01-02")).toBe("1990-01-02");
    expect(normalizeBirthdayValue("1990-01-02 12:00:00")).toBe("1990-01-02");
  });

  it("拒绝空值与非法格式", () => {
    expect(normalizeBirthdayValue(null)).toBe("");
    expect(normalizeBirthdayValue("")).toBe("");
    expect(normalizeBirthdayValue("1990-1-2")).toBe("");
    expect(normalizeBirthdayValue("invalid")).toBe("");
  });
});

describe("resolveBirthdayLockedState", () => {
  it("无生日时不算锁定", () => {
    expect(resolveBirthdayLockedState({ birthday: null, birthday_locked: 1 })).toBe(false);
  });

  it("有生日且锁定才算锁定", () => {
    expect(resolveBirthdayLockedState({ birthday: "1990-01-02", birthday_locked: 1 })).toBe(true);
    expect(resolveBirthdayLockedState({ birthday: "1990-01-02", birthday_locked: 0 })).toBe(false);
  });
});
