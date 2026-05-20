/**
 * 登录页 / Cookie / 页脚引用的政策页默认正文。
 * slug: privacy-policy | terms-of-service
 */

const POLICY_PLACEHOLDER_MARKERS = [
  '请在后台「内容管理」中维护',
  '可在后台「内容管理」继续编辑',
  '在这里填写',
];

function isPolicyPlaceholderBody(body) {
  const text = String(body || '').trim();
  if (!text) return true;
  if (text.length < 80) return true;
  return POLICY_PLACEHOLDER_MARKERS.some((m) => text.includes(m));
}

const DEFAULT_PRIVACY_POLICY_BODY = [
  '<section>',
  '<h2>引言</h2>',
  '<p>我们重视并依法保护您的个人信息。本隐私政策说明我们如何收集、使用、保存、共享和保护您在本站提交的资料。</p>',
  '</section>',
  '<section>',
  '<h2>我们收集的信息</h2>',
  '<p>我们可能收集的信息包括：姓名、手机号、邮箱、收货地址、订单记录、支付状态、售后记录、设备与访问日志、Cookie 同意记录以及客服沟通内容。</p>',
  '</section>',
  '<section>',
  '<h2>信息的使用</h2>',
  '<p>我们使用这些信息用于：处理订单、安排配送、售后退款、账户安全、客服支持、统计分析、合规留痕，以及在您同意时进行营销触达。</p>',
  '</section>',
  '<section>',
  '<h2>信息共享</h2>',
  '<p>我们仅在必要范围内与支付服务商、物流服务商、云服务商、审计顾问或执法机关共享信息，不会出售您的个人信息。</p>',
  '</section>',
  '<section>',
  '<h2>保存期限</h2>',
  '<p>订单与财务相关资料会按法律和审计要求保存；超过保存期限后将删除、匿名化或限制访问。</p>',
  '</section>',
  '<section>',
  '<h2>您的权利</h2>',
  '<p>您可以申请访问、更正、导出或删除您的资料，也可撤回营销同意。撤回不会影响撤回前已完成的合规处理。</p>',
  '</section>',
  '<section>',
  '<h2>安全事件</h2>',
  '<p>如发生可能影响您权益的数据安全事件，我们将按适用法律要求进行处置与通知。</p>',
  '</section>',
].join('\n');

const DEFAULT_TERMS_OF_SERVICE_BODY = [
  '<section>',
  '<h2>接受条款</h2>',
  '<p>访问或使用本站即表示您同意本服务条款（用户协议）；若不同意，请停止使用本站服务。</p>',
  '</section>',
  '<section>',
  '<h2>商品与服务说明</h2>',
  '<p>商品信息、价格、库存、促销和配送说明以结算页和订单确认信息为准。我们会尽力确保准确，但保留纠正明显错误的权利。</p>',
  '</section>',
  '<section>',
  '<h2>账户与订单</h2>',
  '<p>您应提供真实、完整、可联系的信息。因信息错误导致的配送失败、延迟或额外费用，可能由您承担。</p>',
  '<p>订单需通过本站支持的支付方式完成，订单状态以支付回执和系统记录为准。</p>',
  '</section>',
  '<section>',
  '<h2>禁止行为</h2>',
  '<p>禁止任何滥用行为，包括但不限于恶意下单、刷券套利、攻击系统、冒用他人账户、提交欺诈信息等；违规订单可被取消并限制账户权限。</p>',
  '</section>',
  '<section>',
  '<h2>服务中断</h2>',
  '<p>因不可抗力、承运延迟、支付通道异常、系统维护或法律要求导致的服务中断，我们将尽快修复并协助处理。</p>',
  '</section>',
  '<section>',
  '<h2>适用法律</h2>',
  '<p>本条款的解释与适用以平台运营所在地相关法律法规为准；争议应优先通过客服协商解决。</p>',
  '</section>',
].join('\n');

const POLICY_PAGE_DEFAULTS = {
  'privacy-policy': {
    title: '隐私政策',
    body: DEFAULT_PRIVACY_POLICY_BODY,
  },
  'terms-of-service': {
    title: '服务条款',
    body: DEFAULT_TERMS_OF_SERVICE_BODY,
  },
};

/** 登录页、Cookie 横幅引用的政策 slug（置顶展示） */
const LOGIN_POLICY_SLUGS = ['terms-of-service', 'privacy-policy'];

const DEFAULT_POLICY_PATHS = {
  privacyPolicyPath: '/content/privacy-policy',
  termsPath: '/content/terms-of-service',
};

module.exports = {
  POLICY_PLACEHOLDER_MARKERS,
  isPolicyPlaceholderBody,
  DEFAULT_PRIVACY_POLICY_BODY,
  DEFAULT_TERMS_OF_SERVICE_BODY,
  POLICY_PAGE_DEFAULTS,
  LOGIN_POLICY_SLUGS,
  DEFAULT_POLICY_PATHS,
};
