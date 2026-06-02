import { afterEach, describe, expect, it, vi } from "vitest";
import type { SupportDownloadChannel, SupportDownloadConfig } from "@/types/content";
import { openCustomerService, openSupportChannel } from "@/utils/customerService";

function channel(
  overrides: Partial<SupportDownloadChannel> & Pick<SupportDownloadChannel, "id" | "type">,
): SupportDownloadChannel {
  return {
    id: overrides.id,
    type: overrides.type,
    name: overrides.name || "",
    enabled: overrides.enabled ?? true,
    account: overrides.account || "",
    linkUrl: overrides.linkUrl || "",
    qrUrl: overrides.qrUrl || "",
    description: overrides.description || "",
    sortOrder: overrides.sortOrder || 1,
  };
}

function supportConfig(channels: SupportDownloadChannel[]): string {
  const config: SupportDownloadConfig = {
    enabled: true,
    title: "Support",
    subtitle: "",
    defaultTab: "support",
    support: {
      enabled: true,
      description: "",
      workingHours: "",
      channels,
    },
    download: {
      enabled: false,
      title: "",
      description: "",
      platforms: [],
    },
  };
  return JSON.stringify(config);
}

describe("customerService", () => {
  const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);

  afterEach(() => {
    openSpy.mockClear();
  });

  it("opens WhatsApp with default message and returns whatsapp", () => {
    const result = openCustomerService({
      supportDownloadConfig: supportConfig([
        channel({ id: "wa", type: "whatsapp", account: "+60 12-345 6789" }),
      ]),
    });

    expect(result).toEqual({ action: "whatsapp", channelId: "wa" });
    expect(openSpy).toHaveBeenCalledWith(
      expect.stringContaining("https://wa.me/60123456789?text="),
      "_blank",
      "noopener,noreferrer",
    );
  });

  it("returns wechat when a WeChat link is opened", () => {
    const directResult = openSupportChannel(
      channel({ id: "wechat-link", type: "wechat", linkUrl: "weixin://dl/chat?official" }),
    );
    expect(directResult).toBe("wechat");

    openSpy.mockClear();

    const preferredResult = openCustomerService({
      supportDownloadConfig: supportConfig([
        channel({ id: "wechat-link", type: "wechat", linkUrl: "weixin://dl/chat?official" }),
      ]),
    });

    expect(preferredResult).toEqual({ action: "wechat", channelId: "wechat-link" });
    expect(openSpy).toHaveBeenCalledWith("weixin://dl/chat?official", "_blank", "noopener,noreferrer");
  });

  it("returns wechat_copy when WeChat only has an account", () => {
    const result = openCustomerService({
      supportDownloadConfig: supportConfig([
        channel({ id: "wechat-account", type: "wechat", account: "damatong" }),
      ]),
    });

    expect(result).toEqual({ action: "wechat_copy", wechatId: "damatong", channelId: "wechat-account" });
    expect(openSpy).not.toHaveBeenCalled();
  });

  it("falls back to Telegram and then support page", () => {
    const telegramResult = openCustomerService({
      supportDownloadConfig: supportConfig([
        channel({ id: "tg", type: "telegram", account: "@damatong" }),
      ]),
    });

    expect(telegramResult).toEqual({ action: "telegram", channelId: "tg" });
    expect(openSpy).toHaveBeenCalledWith("https://t.me/damatong", "_blank", "noopener,noreferrer");

    openSpy.mockClear();

    const emptyResult = openCustomerService({
      supportDownloadConfig: supportConfig([]),
    });

    expect(emptyResult).toEqual({ action: "support_page" });
    expect(openSpy).not.toHaveBeenCalled();
  });
});
