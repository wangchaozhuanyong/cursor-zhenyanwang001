const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const serverRoot = path.join(__dirname, '..');
const testEnvPath = path.join(serverRoot, '.env.test');
const localEnvPath = path.join(serverRoot, '.env');

function loadTestEnv() {
  process.env.NODE_ENV = process.env.NODE_ENV || 'test';

  if (fs.existsSync(testEnvPath)) {
    dotenv.config({ path: testEnvPath, override: true });
    return { loaded: true, path: testEnvPath };
  }

  if (process.env.ALLOW_LOCAL_ENV_FOR_TESTS === '1' && fs.existsSync(localEnvPath)) {
    dotenv.config({ path: localEnvPath, override: false });
    return { loaded: true, path: localEnvPath };
  }

  return { loaded: false, path: testEnvPath };
}

function requireTestDatabase() {
  const env = loadTestEnv();
  if (!env.loaded) {
    throw new Error(
      'DB integration tests require server/.env.test. Create it from server/.env.test.example and point DB_NAME to a non-production test database.',
    );
  }

  const dbName = String(process.env.DB_NAME || '');
  const allowProductionLikeName = process.env.ALLOW_PRODUCTION_DB_TESTS === '1';
  if (!allowProductionLikeName && !/(test|ci|dev|staging)/i.test(dbName)) {
    throw new Error(
      `Refusing to run DB integration tests against DB_NAME="${dbName}". Use a test database name or set ALLOW_PRODUCTION_DB_TESTS=1 explicitly.`,
    );
  }

  return env;
}

module.exports = {
  loadTestEnv,
  requireTestDatabase,
};
