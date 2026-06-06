/**
 * Create or reset an admin account.
 *
 * Usage from server/:
 *   ADMIN_PASSWORD=MySecretPass node scripts/create-admin.js
 *   node scripts/create-admin.js 13900000000 MySecretPass
 *   node scripts/create-admin.js 13900000000 MySecretPass super
 *
 * Password must be passed as argv[3] or ADMIN_PASSWORD. This script does not
 * ship with a default admin password.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const db = require('../src/config/db');
const { generateId, generateInviteCode, hashPassword } = require('../src/utils/helpers');
const { syncAdminLegacyRoleToUserRoles } = require('./adminRbacSync');
const {
  buildPhoneLookupCandidates,
  inferCountryCodeForPhone,
  normalizeIntlPhone,
} = require('../src/utils/phone');

async function uniqueInviteCode() {
  for (let i = 0; i < 30; i += 1) {
    const code = generateInviteCode();
    const [[row]] = await db.query('SELECT id FROM users WHERE invite_code = ?', [code]);
    if (!row) return code;
  }
  throw new Error('Unable to generate a unique invite code');
}

function readAdminInput() {
  const phone = (process.argv[2] || process.env.ADMIN_PHONE || '18800000001').trim();
  const password = process.argv[3] || String(process.env.ADMIN_PASSWORD || '').trim();
  const tier = String(process.argv[4] || process.env.ADMIN_ROLE || '').toLowerCase();
  const isSuper = tier === 'super' || tier === 'super_admin';

  if (!phone) throw new Error('Phone is required');
  if (!password) throw new Error('Missing admin password. Pass it as argv[3] or set ADMIN_PASSWORD.');
  if (password.length < 8) throw new Error('Password must be at least 8 characters');
  if (password.length > 64) throw new Error('Password must not exceed 64 characters');
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
    throw new Error('Password must include uppercase, lowercase and number characters');
  }

  return { phone, password, isSuper };
}

async function main() {
  const { phone, password, isSuper } = readAdminInput();
  const legacyRole = isSuper ? 'super_admin' : 'admin';
  const hash = await hashPassword(password);
  const cc = inferCountryCodeForPhone(phone) || '86';
  const normalizedPhone = normalizeIntlPhone(phone, cc) || phone;
  const lookupPhones = buildPhoneLookupCandidates(normalizedPhone, cc);
  const placeholders = lookupPhones.map(() => '?').join(',');
  const [existingRows] = await db.query(
    `SELECT id, phone FROM users WHERE phone IN (${placeholders}) AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1`,
    lookupPhones,
  );
  const existing = existingRows[0];

  if (existing) {
    await db.query(
      "UPDATE users SET phone = ?, password_hash = ?, role = ?, account_status = 'normal' WHERE id = ?",
      [normalizedPhone, hash, legacyRole, existing.id],
    );
    await syncAdminLegacyRoleToUserRoles(existing.id, legacyRole);
    console.log(`OK: reset ${legacyRole} password for ${normalizedPhone}`);
  } else {
    const id = generateId();
    const invite = await uniqueInviteCode();
    await db.query(
      `INSERT INTO users (id, phone, password_hash, nickname, invite_code, parent_invite_code, role, account_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'normal')`,
      [id, normalizedPhone, hash, isSuper ? 'Super Admin' : 'Admin', invite, '', legacyRole],
    );
    await syncAdminLegacyRoleToUserRoles(id, legacyRole);
    console.log(`OK: created ${legacyRole} account for ${normalizedPhone}`);
  }

  console.log('');
  console.log('  phone:', normalizedPhone);
  console.log('  role: ', legacyRole);
  console.log('  login: /admin/login');
  console.log('');
  console.log('Keep this password out of shell history and logs.');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error?.message || error);
    process.exit(1);
  });
