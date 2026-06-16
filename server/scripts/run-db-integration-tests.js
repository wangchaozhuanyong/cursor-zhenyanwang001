const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.join(__dirname, '..');
const envPath = path.join(root, '.env.test');
const tests = process.argv.slice(2);

if (!fs.existsSync(envPath)) {
  console.log('[test:integration] skipped: server/.env.test not found. Copy .env.test.example and point it at a non-production test database to enable DB integration tests.');
  process.exit(0);
}

const nodeArgs = [
  '-r',
  'tsx/cjs',
  '--test',
  '--test-concurrency=1',
  '--test-force-exit',
  ...tests,
];

const result = spawnSync(process.execPath, nodeArgs, {
  cwd: root,
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'test',
  },
});

process.exit(result.status == null ? 1 : result.status);
