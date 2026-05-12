/**
 * 初始化站点政策内容页（content_pages）
 *
 * 用法（在 server 目录）：
 *   npm run seed:content-pages
 *
 * 行为：
 * - 若对应 slug 已存在（含软删除）则跳过，避免覆盖人工编辑内容
 * - 若库为空，则插入 4 条常用政策页（可在管理后台继续编辑）
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const db = require("../src/config/db");
const { generateId } = require("../src/utils/helpers");

const PAGES = [
  {
    slug: "privacy-policy",
    title: "隐私政策",
    body:
      "本隐私政策用于说明我们如何收集、使用、存储与保护您的个人信息。\n\n" +
      "1. 我们收集的信息：手机号、收货信息、订单信息等。\n" +
      "2. 使用目的：用于下单、发货、售后与账户安全。\n" +
      "3. 信息保护：我们采取合理的安全措施保护您的数据。\n" +
      "4. 信息共享：除法律法规要求或为履行订单所必需外，我们不会向第三方出售您的信息。\n\n" +
      "如对隐私政策有疑问，请联系客服。",
  },
  {
    slug: "terms",
    title: "服务条款",
    body:
      "欢迎使用本平台。您在使用服务前请阅读并同意以下条款。\n\n" +
      "1. 账户与安全：请妥善保管账号信息。\n" +
      "2. 订单与支付：下单后请按提示完成支付或联系客服确认。\n" +
      "3. 售后与争议：如遇问题请先联系客服协商处理。\n" +
      "4. 条款更新：我们可能不定期更新条款，更新后将以站内方式提示。\n\n" +
      "继续使用服务即视为您同意本条款。",
  },
  {
    slug: "refund-policy",
    title: "退款政策",
    body:
      "我们致力于为您提供满意的购物体验。\n\n" +
      "1. 退款条件：符合退货/退款条件的订单可申请退款。\n" +
      "2. 申请时效：建议在收到商品后 7 天内提交申请（以实际页面/客服说明为准）。\n" +
      "3. 退款方式：原路退回或按客服指引处理。\n" +
      "4. 处理时长：审核通过后一般在 3-7 个工作日内完成。\n\n" +
      "具体以客服与订单实际情况为准。",
  },
  {
    slug: "shipping-policy",
    title: "配送政策",
    body:
      "我们将尽快为您安排发货。\n\n" +
      "1. 发货时间：通常在付款后 1-2 个工作日内发货（特殊情况除外）。\n" +
      "2. 配送时效：马来西亚境内一般 2-5 个工作日送达，偏远地区可能更久。\n" +
      "3. 物流查询：可在「我的订单」查看物流信息（如有）。\n\n" +
      "如有任何配送问题，请联系客服。",
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
    // 不覆盖：一旦存在（哪怕软删除）就跳过
    // 软删除场景：用户可在回收站恢复或手工处理
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

