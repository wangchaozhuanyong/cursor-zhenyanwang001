#!/usr/bin/env node
/**
 * Rollback drill for the transaction/promotion restructure migrations.
 *
 * This script intentionally uses server/.env.test and refuses production-like
 * targets. It runs:
 *   up 157..162 -> down 162..157 -> up 157..162
 */
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const envPath = path.join(__dirname, '..', '.env.test');
const TARGET_MIGRATIONS = Object.freeze([
  '157_order_idempotency_and_restructure_flags',
  '158_marketing_activity_v2_types',
  '159_promotion_usage_limits',
  '160_shipping_template_malaysia_rules',
  '161_payment_reconciliation_review',
  '162_order_logistics_snapshot',
]);
const SAFE_DB_NAME_PATTERN = /(test|ci|dev|staging)/i;

function fail(message) {
  throw new Error(`[migration:restructure-drill] ${message}`);
}

function loadTestEnv() {
  if (!fs.existsSync(envPath)) {
    console.log('[migration:restructure-drill] skipped: server/.env.test not found. Copy .env.test.example and point it at a non-production test database to enable the drill.');
    return false;
  }

  if (String(process.env.NODE_ENV || '').toLowerCase() === 'production') {
    fail('refusing to run with NODE_ENV=production');
  }

  dotenv.config({ path: envPath });

  if (!process.env.DB_NAME && process.env.TEST_DB_NAME) {
    process.env.DB_NAME = process.env.TEST_DB_NAME;
  }

  if (String(process.env.NODE_ENV || '').toLowerCase() === 'production') {
    fail('server/.env.test must not set NODE_ENV=production');
  }

  process.env.NODE_ENV = 'test';
  return true;
}

function assertSafeTarget() {
  const dbName = String(process.env.DB_NAME || '').trim();
  if (!dbName) fail('DB_NAME is required in server/.env.test');
  if (!SAFE_DB_NAME_PATTERN.test(dbName) && process.env.ALLOW_RESTRUCTURE_MIGRATION_DRILL_UNSAFE_DB !== '1') {
    fail(`refusing database "${dbName}". Use a name containing test/ci/dev/staging, or set ALLOW_RESTRUCTURE_MIGRATION_DRILL_UNSAFE_DB=1 for an approved temporary database.`);
  }
}

function assertTargetsExist(allMigrations) {
  const available = new Set(allMigrations);
  const missing = TARGET_MIGRATIONS.filter((name) => !available.has(name));
  if (missing.length) fail(`missing migration files: ${missing.join(', ')}`);
}

function assertNoLaterAppliedMigrations(allMigrations, appliedMigrations) {
  const lastTarget = TARGET_MIGRATIONS[TARGET_MIGRATIONS.length - 1];
  const lastTargetIndex = allMigrations.indexOf(lastTarget);
  const laterApplied = appliedMigrations.filter((name) => allMigrations.indexOf(name) > lastTargetIndex);
  if (laterApplied.length && process.env.ALLOW_NON_TIP_RESTRUCTURE_DRILL !== '1') {
    fail(`later migrations are already applied: ${laterApplied.join(', ')}. Run this drill on a fresh/staging clone before newer migrations, or set ALLOW_NON_TIP_RESTRUCTURE_DRILL=1 only after reviewing dependencies.`);
  }
}

async function main() {
  if (!loadTestEnv()) return;
  assertSafeTarget();

  const db = require('../src/config/db');
  const {
    listAppliedMigrationNames,
    listMigrationBases,
    runNamedMigrations,
    runNamedMigrationsDown,
  } = require('../src/db/migrateRunner');

  try {
    const allMigrations = listMigrationBases();
    assertTargetsExist(allMigrations);
    const appliedMigrations = await listAppliedMigrationNames();
    assertNoLaterAppliedMigrations(allMigrations, appliedMigrations);

    console.log(`[migration:restructure-drill] target database: ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '3306'}/${process.env.DB_NAME}`);
    console.log('[migration:restructure-drill] step 1/3 apply restructure migrations');
    await runNamedMigrations(TARGET_MIGRATIONS);

    console.log('[migration:restructure-drill] step 2/3 rollback restructure migrations');
    await runNamedMigrationsDown([...TARGET_MIGRATIONS].reverse());

    console.log('[migration:restructure-drill] step 3/3 re-apply restructure migrations');
    await runNamedMigrations(TARGET_MIGRATIONS);

    console.log('[migration:restructure-drill] completed');
  } finally {
    await db.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
