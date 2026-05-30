/**
 * 检测 migrations 目录中「数字前缀」重复的多套功能迁移。
 * 说明：执行顺序按完整文件名排序；同前缀不同后缀会相邻，但易误导维护者。
 * 已上线环境请勿随意重命名 schema_migrations 中已有记录。
 */
const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');
const KNOWN_DUPLICATE_PREFIXES = new Map([
  ['037', ['037_auth_oauth_otp', '037_home_ops', '037_logistics_tracking', '037_member_levels', '037_product_video', '037_search_enhancement', '037_user_tags']],
  ['048', ['048_myinvois_compliance', '048_order_payment_timeout']],
  ['049', ['049_checkout_abandonments', '049_orders_shipping_phone']],
  ['050', ['050_malaysia_local_payment_channels', '050_users_user_disabled_role']],
  ['057', ['057_browsing_history_viewed_at', '057_user_account_status_and_member_level_benefits']],
  ['070', ['070_add_gallery_minimal_skin', '070_order_discount_meta']],
  ['081', ['081_drop_member_level_coupon_pack_id', '081_organic_sandstone_coupon_premium_pink']],
  ['103', ['103_admin_mfa', '103_purge_legacy_demo_catalog']],
  ['108', ['108_admin_mfa_required', '108_admin_order_voice_preference']],
  ['117', ['117_coupon_lifecycle_closure', '117_inventory_stock_limits']],
  ['124', ['124_admin_sensitive_action_tokens', '124_order_payable_amount_backfill', '124_replenishment_run_item_suggestions']],
]);

function sameNames(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  const left = [...a].sort();
  const right = [...b].sort();
  return left.every((name, index) => name === right[index]);
}

function main() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.log('[check:migrations] migrations 目录不存在，跳过');
    return;
  }
  const files = fs.readdirSync(MIGRATIONS_DIR);
  const bases = new Set();
  for (const f of files) {
    const m = f.match(/^(.+)\.up\.(sql|js)$/);
    if (m) bases.add(m[1]);
  }
  const byPrefix = new Map();
  for (const name of bases) {
    const m = name.match(/^(\d+)_/);
    if (!m) continue;
    const prefix = m[1];
    if (!byPrefix.has(prefix)) byPrefix.set(prefix, []);
    byPrefix.get(prefix).push(name);
  }
  const conflicts = [...byPrefix.entries()].filter(([, names]) => names.length > 1);
  const unexpectedConflicts = conflicts.filter(([prefix, names]) => (
    !sameNames(names, KNOWN_DUPLICATE_PREFIXES.get(prefix))
  ));
  if (!unexpectedConflicts.length) {
    console.log(`[check:migrations] ok (${bases.size} 个 up 迁移，无前缀冲突)`);
    if (conflicts.length) {
      console.log(`[check:migrations] 已忽略 ${conflicts.length} 组历史重复编号；新增迁移仍禁止复用这些编号`);
    }
    return;
  }
  console.error('[check:migrations] 发现重复数字前缀（按完整文件名排序执行，请避免新增同前缀迁移）：');
  for (const [prefix, names] of unexpectedConflicts.sort((a, b) => Number(a[0]) - Number(b[0]))) {
    console.error(`  ${prefix}: ${names.sort().join(', ')}`);
  }
  process.exit(1);
}

main();
