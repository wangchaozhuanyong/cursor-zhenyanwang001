/**
 * 初始化站点政策内容页（content_pages）。
 * 用法：在 server 目录执行 npm run seed:content-pages
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
      "我们重视并依法保护您的个人信息。本政策说明我们如何收集、使用、保存、共享和保护您在本站提交的资料。",
      "我们可能收集的信息包括：姓名、手机号、邮箱、收货地址、订单记录、支付状态、售后记录、设备与访问日志、Cookie 同意记录以及客服沟通内容。",
      "我们使用这些信息用于：处理订单、安排配送、售后退款、账户安全、客服支持、统计分析、合规留痕，以及在您同意时进行营销触达。",
      "我们仅在必要范围内与支付服务商、物流服务商、云服务商、审计顾问或执法机关共享信息，不会出售您的个人信息。",
      "订单与财务相关资料会按法律和审计要求保存；超过保存期限后将删除、匿名化或限制访问。",
      "您可以申请访问、更正、导出或删除您的资料，也可撤回营销同意。撤回不会影响撤回前已完成的合规处理。",
      "如发生可能影响您权益的数据安全事件，我们将按适用法律要求进行处置与通知。",
    ].join("\n\n"),
  },
  {
    slug: "terms-of-service",
    title: "服务条款",
    body: [
      "访问或使用本站即表示您同意本服务条款；若不同意，请停止使用本站服务。",
      "商品信息、价格、库存、促销和配送说明以结算页和订单确认信息为准。我们会尽力确保准确，但保留纠正明显错误的权利。",
      "您应提供真实、完整、可联系的信息。因信息错误导致的配送失败、延迟或额外费用，可能由您承担。",
      "订单需通过本站支持的支付方式完成，订单状态以支付回执和系统记录为准。",
      "禁止任何滥用行为，包括但不限于恶意下单、刷券套利、攻击系统、冒用他人账户、提交欺诈信息等；违规订单可被取消并限制账户权限。",
      "因不可抗力、承运延迟、支付通道异常、系统维护或法律要求导致的服务中断，我们将尽快修复并协助处理。",
    ].join("\n\n"),
  },
  {
    slug: "refund-policy",
    title: "退款政策",
    body: [
      "退款/退货/换货按订单商品维度处理。提交申请时请提供订单号、商品规格、数量、问题描述及必要凭证（图片/视频）。",
      "一般建议在签收后 7 天内发起售后申请。商品需保持未影响二次销售状态；质量问题或错漏发可优先处理。",
      "以下情况可能不支持退款：人为损坏、超出售后时限、定制商品、无法提供必要凭证、与订单不一致等。",
      "质量问题或错漏发造成的合理退回运费由商家承担；非质量原因的来回运费可能由买家承担，以客服审核结果为准。",
      "退款可全额或部分处理。审核通过并确认收货后将按原支付渠道退款；人工退款会在后台留存处理记录。",
      "到账时间受支付通道与银行处理时效影响；若超过合理时限未到账，请联系客服并提供订单号。",
    ].join("\n\n"),
  },
  {
    slug: "shipping-policy",
    title: "配送说明",
    body: [
      "配送范围以马来西亚地区为主，运费会根据收货地区、订单金额、重量与配送模板规则动态计算。",
      "西马与东马（Sabah / Sarawak / Labuan）可能适用不同运费与时效；偏远地区或特殊商品可能产生附加费用。",
      "通常订单会在支付成功后 1-2 个工作日内处理。促销期、公共假期或预售商品可能延长处理时间。",
      "发货后会提供承运商和运单号，物流轨迹以承运商官方系统为准。",
      "如遇地址错误、拒收、无人签收或包裹异常，请尽快联系客服；二次派送可能产生额外费用。",
    ].join("\n\n"),
  },
  {
    slug: "contact-us",
    title: "联系我们",
    body: [
      "如需咨询订单、支付、物流、售后、资料导出或账户问题，请通过站内客服入口联系我们。",
      "联系时请提供订单号、手机号和问题说明；涉及退款或物流争议时请附上截图或凭证以便快速处理。",
      "我们通常在工作时间优先处理已支付订单和售后请求。支付异常请同时提供支付时间、金额和支付渠道。",
    ].join("\n\n"),
  },
];

async function hasSlug(slug) {
  const [[row]] = await db.query("SELECT id FROM content_pages WHERE slug = ? LIMIT 1", [slug]);
  return Boolean(row?.id);
}

async function insertPage(page) {
  await db.query(
    `INSERT INTO content_pages (id, slug, title, body, publish_status, last_modified_at)
     VALUES (?, ?, ?, ?, 'published', NOW())`,
    [generateId(), page.slug, page.title, page.body],
  );
}

async function main() {
  const [[dbName]] = await db.query("SELECT DATABASE() AS db");
  console.log("DB:", dbName.db);

  let inserted = 0;
  let skipped = 0;
  for (const page of PAGES) {
    // eslint-disable-next-line no-await-in-loop
    const exists = await hasSlug(page.slug);
    if (exists) {
      skipped += 1;
      console.log("skip:", page.slug);
      continue;
    }
    // eslint-disable-next-line no-await-in-loop
    await insertPage(page);
    inserted += 1;
    console.log("insert:", page.slug);
  }
  console.log(`done. inserted=${inserted}, skipped=${skipped}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

