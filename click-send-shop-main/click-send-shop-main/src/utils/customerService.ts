import type { SiteInfo } from "@/types/content";

/** 打开客服渠道：优先 WhatsApp，其次复制微信号，最后跳转联系页 */
export function openCustomerService(siteInfo: Pick<SiteInfo, "whatsappUrl" | "contactWhatsApp" | "wechatId">): {
  action: "whatsapp" | "wechat_copy" | "contact_page";
  wechatId?: string;
} {
  const whatsappUrl =
    (siteInfo.whatsappUrl || "").trim() ||
    (siteInfo.contactWhatsApp
      ? `https://wa.me/${siteInfo.contactWhatsApp.replace(/\D/g, "")}?text=${encodeURIComponent("你好，我想咨询商品")}`
      : "");

  if (whatsappUrl) {
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
    return { action: "whatsapp" };
  }

  const wechatId = (siteInfo.wechatId || "").trim();
  if (wechatId) {
    return { action: "wechat_copy", wechatId };
  }

  return { action: "contact_page" };
}
