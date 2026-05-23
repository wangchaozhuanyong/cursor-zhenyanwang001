import type { HelpCenterConfig } from "@/types/content";

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

/** 与 server/src/data/defaultHelpCenterConfig.js 保持一致（仅 FAQ） */
export const DEFAULT_HELP_CENTER_CONFIG: HelpCenterConfig = {
  categories: [
    { id: "platform", name: "平台介绍", sortOrder: 1, enabled: true },
    { id: "visa", name: "签证留学", sortOrder: 2, enabled: true },
    { id: "mm2h", name: "第二家园", sortOrder: 3, enabled: true },
    { id: "fitout", name: "商业装修", sortOrder: 4, enabled: true },
    { id: "order", name: "商品下单", sortOrder: 5, enabled: true },
    { id: "pay", name: "支付配送", sortOrder: 6, enabled: true },
    { id: "after", name: "售后退款", sortOrder: 7, enabled: true },
    { id: "compliance", name: "合规说明", sortOrder: 8, enabled: true },
    { id: "privacy", name: "账户隐私", sortOrder: 9, enabled: true },
    { id: "contact", name: "客服联系", sortOrder: 10, enabled: true },
  ],
  faqs: [
    { id: "platform-1", categoryId: "platform", question: "平台主要提供什么服务？", answer: "平台提供商品、服务信息与客户支持。不同商品或服务的条件、周期、费用和适用范围，需要根据实际情况以页面说明和客服确认为准。", sortOrder: 1, enabled: true },
    { id: "platform-2", categoryId: "platform", question: "平台是购物网站还是服务平台？", answer: "平台可用于展示商品、服务和内容说明。具体服务范围、商品状态、费用和后续流程，以页面说明和客服确认为准。", sortOrder: 2, enabled: true },
    { id: "platform-3", categoryId: "platform", question: "平台主要服务哪些用户？", answer: "平台主要服务在马来西亚生活、工作、学习、创业或有相关需求的中文用户。平台内容以中文说明为主，适用地区以马来西亚本地为主。", sortOrder: 3, enabled: true },
    { id: "visa-1", categoryId: "visa", question: "签证和留学服务可以保证通过吗？", answer: "不能保证通过。相关申请结果取决于申请人资料、政策要求、审核进度和主管部门决定。平台可提供资料整理、流程说明、服务对接和进度协助，但不承诺任何审核结果。", sortOrder: 1, enabled: true },
    { id: "visa-2", categoryId: "visa", question: "办理前需要准备哪些资料？", answer: "不同项目需要的资料不同。一般可能涉及护照、个人资料、资金证明、学历资料、工作资料、照片、申请表格等。具体资料清单请先联系客服确认。", sortOrder: 2, enabled: true },
    { id: "mm2h-1", categoryId: "mm2h", question: "第二家园申请一定可以成功吗？", answer: "不能保证成功。申请结果取决于申请人条件、资料完整度、政策要求和主管部门审核结果。平台只提供流程咨询和服务协助，不承诺最终审批结果。", sortOrder: 1, enabled: true },
    { id: "fitout-1", categoryId: "fitout", question: "商业装修报价是固定的吗？", answer: "不是固定价格。报价通常需要根据面积、位置、风格、材料、施工难度、工期和现场情况评估。建议先提供现场照片、尺寸、预算和装修需求。", sortOrder: 1, enabled: true },
    { id: "order-1", categoryId: "order", question: "提交订单后是否代表交易完成？", answer: "不一定。提交订单后通常还需要客服确认库存、地区、付款方式和服务细节。订单是否生效，以客服确认和实际付款状态为准。", sortOrder: 1, enabled: true },
    { id: "pay-1", categoryId: "pay", question: "是否支持全马配送？", answer: "不同商品或服务的适用地区不同，部分商品可能受库存、物流、地区或当地规则限制。是否支持指定地区，需要以下单页和客服确认为准。", sortOrder: 1, enabled: true },
    { id: "after-1", categoryId: "after", question: "服务类订单可以退款吗？", answer: "服务类订单是否可以退款，需要根据服务是否已经开始、资料是否已经提交、第三方费用是否已经产生等情况判断。具体以服务说明和客服确认为准。", sortOrder: 1, enabled: true },
    { id: "compliance-1", categoryId: "compliance", question: "平台是否展示受监管商品？", answer: "平台可能展示部分受年龄、地区或当地规则限制的商品信息。此类内容仅面向符合法定年龄并符合当地规定的用户展示，具体是否可咨询或处理，以当地法律法规、平台规则和客服确认为准。", sortOrder: 1, enabled: true },
    { id: "compliance-2", categoryId: "compliance", question: "未成年人可以浏览或购买受监管商品吗？", answer: "不可以。涉及年龄限制、特殊监管或不适合未成年人的商品或服务，不面向未成年人展示、咨询或处理。", sortOrder: 2, enabled: true },
    { id: "privacy-1", categoryId: "privacy", question: "可以删除或修改个人资料吗？", answer: "如需修改或删除账户资料，可以联系客服处理。部分订单、交易、合规或售后记录可能需要根据平台规则或法律要求保留一定时间。", sortOrder: 1, enabled: true },
    { id: "contact-1", categoryId: "contact", question: "如何联系客服？", answer: "请通过页面底部「客服」或帮助中心下方的「前往客服中心」，选择微信、WhatsApp、Telegram 等官方渠道联系。", sortOrder: 1, enabled: true },
  ],
};

export const ABOUT_PLACEHOLDER_MARKERS = [
  "在这里填写关于我们",
  "可在后台「内容管理」继续编辑",
  "请在后台「内容管理」中维护",
];

export function isAboutPlaceholderBody(body?: string | null): boolean {
  const text = String(body || "").trim();
  if (!text) return true;
  return ABOUT_PLACEHOLDER_MARKERS.some((m) => text.includes(m));
}

export function helpConfigToFaqItems(config: HelpCenterConfig): { categories: string[]; faqs: FaqItem[] } {
  const enabledCategories = [...config.categories]
    .filter((cat) => cat.enabled !== false)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const categoryNameById = new Map(enabledCategories.map((cat) => [cat.id, cat.name]));
  const faqs = [...config.faqs]
    .filter((faq) => faq.enabled !== false && categoryNameById.has(faq.categoryId))
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((faq) => ({
      id: faq.id,
      category: categoryNameById.get(faq.categoryId) || "常见问题",
      question: faq.question,
      answer: faq.answer,
    }))
    .filter((faq) => faq.question && faq.answer);
  return {
    categories: enabledCategories.map((cat) => cat.name),
    faqs,
  };
}

const derived = helpConfigToFaqItems(DEFAULT_HELP_CENTER_CONFIG);
export const DEFAULT_FAQ_CATEGORIES = derived.categories;
export const DEFAULT_FAQS = derived.faqs;

export function normalizeHelpCenterConfig(input: unknown): HelpCenterConfig {
  const obj = (input || {}) as Partial<HelpCenterConfig> & {
    workingHours?: string;
    contactNote?: string;
  };
  const categories = Array.isArray(obj.categories) ? obj.categories : [];
  const faqs = Array.isArray(obj.faqs) ? obj.faqs : [];
  const normalizedCategories = categories.map((c, idx) => ({
    id: String(c.id || `cat_${idx + 1}`),
    name: String(c.name || "").trim(),
    sortOrder: Number(c.sortOrder ?? idx + 1) || idx + 1,
    enabled: c.enabled !== false,
  }));
  const categoryIdSet = new Set(normalizedCategories.map((c) => c.id));
  const normalizedFaqs = faqs.map((f, idx) => ({
    id: String(f.id || `faq_${idx + 1}`),
    categoryId: categoryIdSet.has(String(f.categoryId || "")) ? String(f.categoryId) : (normalizedCategories[0]?.id || ""),
    question: String(f.question || "").trim(),
    answer: String(f.answer || "").trim(),
    sortOrder: Number(f.sortOrder ?? idx + 1) || idx + 1,
    enabled: f.enabled !== false,
  }));
  return {
    categories: normalizedCategories.length ? normalizedCategories : DEFAULT_HELP_CENTER_CONFIG.categories,
    faqs: normalizedFaqs.length ? normalizedFaqs : DEFAULT_HELP_CENTER_CONFIG.faqs,
  };
}

export function buildDefaultHelpCenterConfig(): HelpCenterConfig {
  return normalizeHelpCenterConfig(DEFAULT_HELP_CENTER_CONFIG);
}
