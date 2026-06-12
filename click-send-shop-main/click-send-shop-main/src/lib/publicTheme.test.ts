import { describe, expect, it } from "vitest";

import {
  DEFAULT_PUBLIC_THEME,
  isPublicTheme,
  resolvePublicTheme,
  resolvePublicThemeFromSkin,
} from "./publicTheme";

describe("publicTheme", () => {
  it("validates supported public themes", () => {
    expect(isPublicTheme("ivory-gold")).toBe(true);
    expect(isPublicTheme("pearl-slate")).toBe(true);
    expect(isPublicTheme("linen-walnut")).toBe(true);
    expect(isPublicTheme("sage-stone")).toBe(true);
    expect(isPublicTheme("ruby-cream")).toBe(true);
    expect(isPublicTheme("obsidian-gold")).toBe(false);
    expect(isPublicTheme("dark-premium")).toBe(false);
    expect(isPublicTheme("black-gold")).toBe(false);
    expect(isPublicTheme("unknown")).toBe(false);
  });

  it("falls back to default theme", () => {
    expect(resolvePublicTheme("unknown")).toBe(DEFAULT_PUBLIC_THEME);
    expect(resolvePublicTheme(null)).toBe(DEFAULT_PUBLIC_THEME);
    expect(resolvePublicTheme(undefined)).toBe(DEFAULT_PUBLIC_THEME);
  });

  it("maps legacy dark themes to the light default", () => {
    expect(resolvePublicTheme("obsidian-gold")).toBe("ivory-gold");
    expect(resolvePublicTheme("dark-premium")).toBe("ivory-gold");
    expect(resolvePublicTheme("black-gold")).toBe("ivory-gold");
    expect(resolvePublicTheme("luxury-dark")).toBe("ivory-gold");
  });

  it("maps legacy public themes to the replacement light themes", () => {
    expect(resolvePublicTheme("classic-luxury")).toBe("ivory-gold");
    expect(resolvePublicTheme("modern-light")).toBe("pearl-slate");
    expect(resolvePublicTheme("warm-home")).toBe("linen-walnut");
    expect(resolvePublicTheme("brand-red")).toBe("ruby-cream");
  });

  it("maps existing runtime skins to public theme families", () => {
    expect(resolvePublicThemeFromSkin({ id: "premium_champagne_ivory" } as never, null)).toBe("ivory-gold");
    expect(resolvePublicThemeFromSkin({ id: "premium_sky_silk" } as never, null)).toBe("pearl-slate");
    expect(resolvePublicThemeFromSkin({ id: "premium_apricot_sand" } as never, null)).toBe("linen-walnut");
    expect(resolvePublicThemeFromSkin({ id: "premium_porcelain_jade" } as never, null)).toBe("sage-stone");
    expect(resolvePublicThemeFromSkin({ id: "premium_pearl_blush" } as never, null)).toBe("ruby-cream");
    expect(resolvePublicThemeFromSkin({ id: "festival_spring_ruby_gold" } as never, null)).toBe("ruby-cream");
  });
});
