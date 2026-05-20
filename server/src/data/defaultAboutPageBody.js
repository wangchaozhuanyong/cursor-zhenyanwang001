/**
 * 「关于我们」默认正文（HTML）。slug=about，前台路由 /about。
 */
const DEFAULT_ABOUT_PAGE_BODY = [
  '<section>',
  '<h2>平台简介</h2>',
  '<p>本平台提供商品、服务与客户支持信息。你可以通过页面说明了解商品、服务流程、使用规则和联系方式。</p>',
  '<p>平台主要服务在马来西亚生活、工作、学习、创业或有相关需求的中文用户，内容以中文说明为主。</p>',
  '</section>',
  '<section>',
  '<h2>服务范围</h2>',
  '<p>平台可用于展示商品、服务和内容说明，包括商品下单、支付配送、售后退款及相关咨询对接。</p>',
  '<p>不同商品或服务的条件、周期、费用和适用范围，以页面说明和客服确认为准。</p>',
  '</section>',
  '<section>',
  '<h2>合规与说明</h2>',
  '<p>涉及签证、第二家园、商业装修等服务类项目，申请结果取决于主管部门审核，平台不承诺审批结果。</p>',
  '<p>部分商品可能受年龄、地区或当地规则限制，请以平台规则与当地法律法规为准。</p>',
  '</section>',
  '<section>',
  '<h2>联系我们</h2>',
  '<p>如需咨询订单、支付、物流、售后或账户问题，请通过站内客服入口（WhatsApp / 微信等）联系我们，并尽量提供订单号与问题说明以便快速处理。</p>',
  '</section>',
].join('\n');

/** 迁移/脚本判定：仍为占位文案时可安全替换为默认正文 */
const ABOUT_PLACEHOLDER_MARKERS = [
  '在这里填写关于我们',
  '可在后台「内容管理」继续编辑',
  '请在后台「内容管理」中维护',
];

function isAboutPlaceholderBody(body) {
  const text = String(body || '').trim();
  if (!text) return true;
  return ABOUT_PLACEHOLDER_MARKERS.some((m) => text.includes(m));
}

module.exports = {
  DEFAULT_ABOUT_PAGE_BODY,
  ABOUT_PLACEHOLDER_MARKERS,
  isAboutPlaceholderBody,
};
