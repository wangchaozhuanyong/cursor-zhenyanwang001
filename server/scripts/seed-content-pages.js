/**
 * 初始化站点政策内容页（content_pages）。
 * 用法：在 server 目录执行 npm run seed:content-pages
 * 已存在的 slug 会跳过，避免覆盖后台手工编辑内容。
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const db = require("../src/config/db");
const { generateId } = require("../src/utils/helpers");
const { DEFAULT_ABOUT_PAGE_BODY, isAboutPlaceholderBody } = require("../src/data/defaultAboutPageBody");
const {
  POLICY_PAGE_DEFAULTS,
  isPolicyPlaceholderBody,
} = require("../src/data/defaultPolicyPageBodies");

const PAGES = [
  {
    slug: "about",
    title: "关于我们",
    body: DEFAULT_ABOUT_PAGE_BODY,
  },
  {
    slug: "privacy-policy",
    title: POLICY_PAGE_DEFAULTS["privacy-policy"].title,
    body: POLICY_PAGE_DEFAULTS["privacy-policy"].body,
  },
  {
    slug: "terms-of-service",
    title: POLICY_PAGE_DEFAULTS["terms-of-service"].title,
    body: POLICY_PAGE_DEFAULTS["terms-of-service"].body,
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

async function getPageBySlug(slug) {
  const [[row]] = await db.query(
    "SELECT id, body FROM content_pages WHERE slug = ? AND deleted_at IS NULL LIMIT 1",
    [slug],
  );
  return row || null;
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
  let updated = 0;
  let skipped = 0;
  for (const page of PAGES) {
    // eslint-disable-next-line no-await-in-loop
    const existing = await getPageBySlug(page.slug);
    if (!existing) {
      // eslint-disable-next-line no-await-in-loop
      await insertPage(page);
      inserted += 1;
      console.log("insert:", page.slug);
      continue;
    }
    const isPlaceholder =
      (page.slug === "about" && isAboutPlaceholderBody(existing.body))
      || (["privacy-policy", "terms-of-service"].includes(page.slug) && isPolicyPlaceholderBody(existing.body));
    if (isPlaceholder) {
      // eslint-disable-next-line no-await-in-loop
      await db.query(
        "UPDATE content_pages SET body = ?, title = ?, last_modified_at = NOW() WHERE id = ?",
        [page.body, page.title, existing.id],
      );
      updated += 1;
      console.log("update placeholder:", page.slug);
      continue;
    }
    skipped += 1;
    console.log("skip:", page.slug);
  }
  console.log(`done. inserted=${inserted}, updated=${updated}, skipped=${skipped}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

