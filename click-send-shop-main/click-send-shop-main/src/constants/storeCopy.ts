export const STORE_COPY = {
  brandName: "大马通",
  brandDomain: "Damatong.net",
  siteSlogan: "马来西亚华人一站式生活服务与优选商城",
  siteDescription:
    "大马通专注服务马来西亚华人，整合本地优选商品、中国好物、正品保税、工厂货源、签证留学、第二家园与商业服务资源，让在马生活、采购、办事更省心。",
  searchPlaceholder: "搜索商品、服务或品牌",
  supportCenterTitle: "客服中心",
  supportSubtitle: "如需咨询商品、订单、售后或使用问题，请联系大马通客服。",
  supportDescription: "请选择下方客服渠道咨询商品、订单、售后或使用问题。",
  browseAllCategories: "浏览分类",
  browseAllServices: "浏览全部服务",
  contactSupport: "联系客服",
} as const;

export const STORE_LEGACY_GENERIC_COPY = {
  siteNames: ["官方商城", "站点"],
  siteSlogans: ["官方商品与服务平台"],
  siteDescriptions: [
    "本平台提供商品、服务与客户支持信息。",
    "本平台提供商品、服务与客户支持信息。你可以通过页面说明了解商品、服务流程、使用规则和联系方式。",
  ],
  supportTitles: ["客服与安装"],
} as const;

export function isLegacyGenericCopy(value: string | undefined | null, values: readonly string[]): boolean {
  return values.includes(String(value || "").trim());
}

export function buildStoreCopyright(year = new Date().getFullYear()): string {
  return `© ${year} ${STORE_COPY.brandName} 版权所有`;
}
