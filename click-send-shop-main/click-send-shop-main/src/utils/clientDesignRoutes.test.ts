import { describe, expect, it } from "vitest";

import { shouldEnableClientDesignRoutes } from "@/utils/clientDesignRoutes";

describe("clientDesignRoutes", () => {
  it("keeps internal design QA routes available during development", () => {
    expect(shouldEnableClientDesignRoutes({ isDev: true, hostname: "damatong.net" })).toBe(true);
  });

  it("keeps internal design QA routes available on local preview hosts", () => {
    expect(shouldEnableClientDesignRoutes({ isDev: false, hostname: "localhost" })).toBe(true);
    expect(shouldEnableClientDesignRoutes({ isDev: false, hostname: "127.0.0.1" })).toBe(true);
  });

  it("keeps internal design QA routes closed on production domains", () => {
    expect(shouldEnableClientDesignRoutes({ isDev: false, hostname: "damatong.net" })).toBe(false);
    expect(shouldEnableClientDesignRoutes({ isDev: false, hostname: "www.damatong.net" })).toBe(false);
  });
});
