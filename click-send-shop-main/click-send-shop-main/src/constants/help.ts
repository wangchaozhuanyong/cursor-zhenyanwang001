export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

export const FAQS: FaqItem[] = [
  { id: "1", category: "订单", question: "如何下单？", answer: "浏览商品 → 加入购物车 → 确认订单 → 选择支付方式 → 提交订单 → 通过 WhatsApp 或微信发送订单信息给客服即可完成下单。" },
  { id: "2", category: "订单", question: "订单提交后可以修改吗？", answer: "订单提交后，请尽快联系客服修改。如果已经发货则无法修改，但可以申请退换货。" },
  { id: "3", category: "支付", question: "支持哪些支付方式？", answer: "目前支持 WhatsApp 和微信转账支付。在线支付功能即将上线，届时将支持银行转账、电子钱包等更多方式。" },
  { id: "4", category: "物流", question: "多久可以收到货？", answer: "下单后 1-2 个工作日内发货，马来西亚境内通常 2-5 个工作日送达。偏远地区可能需要 5-7 个工作日。" },
  { id: "5", category: "物流", question: "如何查看物流信息？", answer: "在「我的订单」页面找到对应订单，点击查看详情即可看到物流追踪信息。发货后客服也会通过 WhatsApp 发送快递单号。" },
  { id: "6", category: "退换", question: "收到商品不满意可以退货吗？", answer: "收到商品 7 天内，如商品未拆封、不影响二次销售，可联系客服申请退货。部分商品（如护肤品已拆封）不支持退货。" },
  { id: "7", category: "积分", question: "积分怎么获得？", answer: "每笔订单完成后可获得与金额等值的积分。邀请好友注册也可以获得积分奖励。积分可在后续订单中抵扣使用。" },
  { id: "8", category: "积分", question: "积分有有效期吗？", answer: "积分自获得之日起 12 个月内有效。建议及时使用，过期积分将自动清零。" },
];

export const FAQ_CATEGORIES = [...new Set(FAQS.map((f) => f.category))];

export const WHATSAPP_URL = "https://wa.me/601234567890?text=你好，我需要帮助";
export const WECHAT_ID = "ZhenYan_CS";
export const WORKING_HOURS = "每天 9:00 - 22:00";
