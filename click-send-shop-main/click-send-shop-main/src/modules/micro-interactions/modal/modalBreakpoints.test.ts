import { describe, expect, it } from "vitest";
import { MODAL_BREAKPOINTS, MQ_DESKTOP, MQ_MOBILE, MQ_SHEET_PREFERRED, MQ_TABLET } from "./modalBreakpoints";

describe("modalBreakpoints", () => {
  it("keeps tablet presentation from 768px through 1279px", () => {
    expect(MODAL_BREAKPOINTS.md).toBe(768);
    expect(MODAL_BREAKPOINTS.xl).toBe(1280);
    expect(MQ_MOBILE).toBe("(max-width: 767px)");
    expect(MQ_TABLET).toBe("(min-width: 768px) and (max-width: 1279px)");
    expect(MQ_DESKTOP).toBe("(min-width: 1280px)");
  });

  it("defaults bottom sheet presentation to mobile only", () => {
    expect(MQ_SHEET_PREFERRED).toBe(MQ_MOBILE);
  });
});
