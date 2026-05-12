/**
 * 初始化站点政策内容页（content_pages）。
 *
 * 用法（在 server 目录）：
 *   npm run seed:content-pages
 *
 * 已存在的 slug 会跳过，避免覆盖后台手工编辑内容。
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const db = require("../src/config/db");
const { generateId } = require("../src/utils/helpers");

const PAGES = [
  {
    slug: "privacy-policy",
    title: "隐私政策",
    body: [
      "本隐私政策说明我们如何依据马来西亚 Personal Data Protection Act 2010（PDPA）收集、使用、保存、披露和保护您的个人资料。",
      "我们可能收集姓名、手机号、电邮、收货地址、订单、支付状态、售后记录、设备信息、Cookie 同意记录和客服沟通内容。",
      "资料用途包括处理订单、计算运费、安排配送、售后退款、账号安全、客户服务、合规留痕、数据分析和在您同意时进行广告衡量。",
      "我们只会在履行订单或法律要求范围内与支付服务商、物流承运商、云服务商、审计顾问或执法机关共享必要资料，不会出售您的个人资料。",
      "订单、发票、退款和售后资料通常会按会计、税务和争议处理需要保存；超过必要期限后会删除、匿名化或归档限制访问。",
      "您可联系客服申请导出、更正、删除账号资料，或撤回分析/广告 Cookie 同意。撤回不影响撤回前已经合法处理的资料。",
      "我们采用访问控制、日志审计、加密传输和最小权限原则保护资料。如发生可能影响您权益的数据事件，我们会按适用法律处理通知。",
    ].join("\n\n"),
  },
  {
    slug: "terms",
    title: "服务条款",
    body: [
      "使用本网站即表示您同意本服务条款。若您不同意，请停止下单或使用账号功能。",
      "商品图片、价格、库存、促销和配送说明以提交订单时页面及后台确认为准。我们会尽力保持信息准确，但保留纠正明显错误的权利。",
      "您应提供真实、完整的联系方式和马来西亚收货地址。因资料错误导致配送失败、延误或额外费用，可能需要由您承担。",
      "订单需通过网站支持的支付方式完成。支付成功以后，订单状态会以支付平台回调及后台记录为准。",
      "您不得滥用优惠券、攻击系统、冒用他人账号、提交欺诈订单或干扰网站正常运营。违规订单可被取消并限制账号。",
      "因不可抗力、承运商延误、支付平台异常、系统维护或法律要求导致的服务中断，我们会尽快恢复并协助处理。",
    ].join("\n\n"),
  },
  {
    slug: "refund-policy",
    title: "退货与退款政策",
    body: [
      "退货、退款和换货以订单商品行为单位处理。申请时请选择对应订单商品、规格/SKU、数量、原因，并按需要上传照片或视频证据。",
      "一般商品建议在签收后 7 天内提交售后申请。商品需保持未使用、包装完整且不影响二次销售，质量问题或错漏发除外。",
      "以下情况可能无法退款：人为损坏、已拆封且影响卫生或安全的商品、定制商品、超过售后期限、无法提供必要证据或与订单不符。",
      "质量问题、错发、漏发由商家承担合理退回运费；非质量原因退货的来回运费可能由买家承担，具体以客服审核结果为准。",
      "退款可全额或部分处理。审核通过并确认退货收妥后，我们会按原支付渠道退款；人工退款会在后台记录凭证和处理人。",
      "退款到账时间取决于支付渠道、银行或电子钱包处理时间。若超过合理期限未到账，请联系客服并提供订单号。",
    ].join("\n\n"),
  },
  {
    slug: "shipping-policy",
    title: "配送政策",
    body: [
      "我们配送范围以马来西亚为主，运费会根据收货州属、邮编、订单金额、重量、商品属性和当前配送规则由后端重新计算。",
      "西马与东马 Sabah / Sarawak / Labuan 可能使用不同运费和时效。偏远地区、特殊体积或特殊温控商品可能产生额外费用。",
      "一般订单会在付款成功后 1 至 2 个工作日内处理。促销期、公共假期、预售商品或库存调拨可能需要更长时间。",
      "后台录入快递公司和运单号后，您可在订单页查看承运商官方查询链接。物流详情以承运商官网为准。",
      "如包裹异常、地址错误、拒收、无人签收或退回仓库，请尽快联系客服。重新配送可能产生额外费用。",
    ].join("\n\n"),
  },
  {
    slug: "contact-us",
    title: "联系我们",
    body: [
      "如需订单、支付、物流、退货退款、隐私资料导出或账号删除协助，请通过网站页脚或个人中心显示的客服方式联系我们。",
      "联系客服时请提供订单号、注册手机号、问题说明和相关截图。涉及退款或物流争议时，请保留商品、包装和承运商凭证。",
      "客服通常会在工作日优先处理已付款订单和售后申请。紧急支付异常请同时提供支付时间、金额和支付渠道。",
    ].join("\n\n"),
  },
];

async function hasSlug(slug) {
  const [[row]] = await db.query("SELECT id FROM content_pages WHERE slug = ? LIMIT 1", [slug]);
  return Boolean(row?.id);
}

async function insertPage(p) {
  await db.query(
    `INSERT INTO content_pages (id, slug, title, body, publish_status, last_modified_at)
     VALUES (?, ?, ?, ?, 'published', NOW())`,
    [generateId(), p.slug, p.title, p.body],
  );
}

async function main() {
  const [[dbName]] = await db.query("SELECT DATABASE() AS db");
  console.log("DB:", dbName.db);

  let inserted = 0;
  let skipped = 0;
  for (const p of PAGES) {
    // eslint-disable-next-line no-await-in-loop
    const exists = await hasSlug(p.slug);
    if (exists) {
      skipped += 1;
      console.log("skip:", p.slug);
      continue;
    }
    // eslint-disable-next-line no-await-in-loop
    await insertPage(p);
    inserted += 1;
    console.log("insert:", p.slug);
  }
  console.log(`done. inserted=${inserted}, skipped=${skipped}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
