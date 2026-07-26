import { beforeEach, describe, expect, it, vi } from "vitest";
import * as homeApi from "@/api/modules/home";
import * as homeService from "@/services/homeService";

vi.mock("@/api/modules/home", () => ({
  getHomeBootstrapLite: vi.fn(),
  getHomeMarketing: vi.fn(),
}));

const getHomeBootstrapLite = vi.mocked(homeApi.getHomeBootstrapLite);

describe("homeService bootstrap request sharing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    homeService.invalidateHomeBootstrapCache();
  });

  it("shares one in-flight bootstrap request", async () => {
    const data = { siteInfo: { siteName: "大马通" } } as homeService.HomeBootstrap;
    type BootstrapResponse = Awaited<ReturnType<typeof homeApi.getHomeBootstrapLite>>;
    let resolveRequest: ((value: BootstrapResponse) => void) | undefined;
    getHomeBootstrapLite.mockReturnValue(new Promise((resolve) => {
      resolveRequest = resolve;
    }));

    const first = homeService.fetchHomeBootstrap();
    const second = homeService.fetchHomeBootstrap();

    expect(getHomeBootstrapLite).toHaveBeenCalledTimes(1);
    resolveRequest?.({ code: 0, message: "ok", data });

    await expect(first).resolves.toBe(data);
    await expect(second).resolves.toBe(data);
  });

  it("suppresses immediate request storms after a failure", async () => {
    const failure = new Error("offline");
    getHomeBootstrapLite.mockRejectedValue(failure);

    await expect(homeService.fetchHomeBootstrap()).rejects.toBe(failure);
    await expect(homeService.fetchHomeBootstrap()).rejects.toBe(failure);
    expect(getHomeBootstrapLite).toHaveBeenCalledTimes(1);

    await expect(homeService.fetchHomeBootstrap({ force: true })).rejects.toBe(failure);
    expect(getHomeBootstrapLite).toHaveBeenCalledTimes(2);
  });
});
