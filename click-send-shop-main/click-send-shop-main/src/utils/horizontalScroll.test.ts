import { describe, expect, it } from "vitest";
import { getCenteredScrollLeft } from "./horizontalScroll";

describe("getCenteredScrollLeft", () => {
  it("centers an item inside the scrollable container", () => {
    expect(
      getCenteredScrollLeft({
        containerScrollLeft: 120,
        containerClientWidth: 300,
        containerScrollWidth: 900,
        containerLeft: 20,
        itemLeft: 260,
        itemWidth: 80,
      }),
    ).toBe(250);
  });

  it("clamps the scroll position at both edges", () => {
    expect(
      getCenteredScrollLeft({
        containerScrollLeft: 0,
        containerClientWidth: 300,
        containerScrollWidth: 900,
        containerLeft: 20,
        itemLeft: 10,
        itemWidth: 80,
      }),
    ).toBe(0);

    expect(
      getCenteredScrollLeft({
        containerScrollLeft: 580,
        containerClientWidth: 300,
        containerScrollWidth: 900,
        containerLeft: 20,
        itemLeft: 360,
        itemWidth: 80,
      }),
    ).toBe(600);
  });
});
