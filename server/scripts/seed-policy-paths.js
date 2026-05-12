/**
 * 初始化「站点设置 → 政策内部页路径」
 *
 * 用法（在 server 目录）：
 *   npm run seed:policy-paths
 *
 * 规则：
 * - 仅在对应 setting_key 不存在或值为空字符串时写入默认值
 * - 已有值不覆盖（避免覆盖线上已配置的自定义 slug）
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const db = require("../src/config/db");
const settingsRepo = require("../src/modules/admin/adminSiteSettings.repository");

const DEFAULT_PATHS = [
  { key: "privacyPolicyPath", value: "/content/privacy-policy" },
  { key: "termsPath", value: "/content/terms" },
  { key: "refundPolicyPath", value: "/content/refund-policy" },
  { key: "shippingPolicyPath", value: "/content/shipping-policy" },
];

async function getSettingValue(key) {
  const [[row]] = await db.query(
    "SELECT setting_value FROM site_settings WHERE setting_key = ? LIMIT 1",
    [key],
  );
  return row ? String(row.setting_value ?? "") : "";
}

async function main() {
  const [[dbName]] = await db.query("SELECT DATABASE() AS db");
  console.log("DB:", dbName.db);

  let updated = 0;
  let skipped = 0;

  for (const item of DEFAULT_PATHS) {
    // eslint-disable-next-line no-await-in-loop
    const current = (await getSettingValue(item.key)).trim();
    if (current) {
      skipped += 1;
      console.log("skip:", item.key, "=", current);
      continue;
    }
    // eslint-disable-next-line no-await-in-loop
    await settingsRepo.upsertSetting(item.key, item.value);
    updated += 1;
    console.log("set:", item.key, "=", item.value);
  }

  console.log(`done. updated=${updated}, skipped=${skipped}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

