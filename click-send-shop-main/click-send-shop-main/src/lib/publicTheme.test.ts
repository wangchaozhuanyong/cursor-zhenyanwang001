import { describe, expect, it } from "vitest";

import {
  DEFAULT_PUBLIC_THEME,
  isPublicTheme,
  resolvePublicTheme,
  resolvePublicThemeFromSkin,
} from "./publicTheme";

describe("publicTheme", () => {
  it("validates supported public themes", () => {
    expect(isPublicTheme("classic-luxury")).toBe(true);
    expect(isPublicTheme("modern-light")).toBe(true);
    expect(isPublicTheme("dark-premium")).toBe(true);
    expect(isPublicTheme("warm-home")).toBe(true);
    expect(isPublicTheme("brand-red")).toBe(true);
    expect(isPublicTheme("unknown")).toBe(false);
  });

  it("falls back to default theme", () => {
    expect(resolvePublicTheme("unknown")).toBe(DEFAULT_PUBLIC_THEME);
    expect(resolvePublicTheme(null)).toBe(DEFAULT_PUBLIC_THEME);
    expect(resolvePublicTheme(undefined)).toBe(DEFAULT_PUBLIC_THEME);
  });

  it("maps existing runtime skins to public theme families", () => {
    expect(resolvePublicThemeFromSkin({ id: "premium_sky_silk" } as never, null)).toBe("modern-light");
    expect(resolvePublicThemeFromSkin({ id: "festival_spring_ruby_gold" } as never, null)).toBe("brand-red");
  });
});
