const test = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

test('module boundaries check passes in strict mode', () => {
  const script = path.join(__dirname, '..', 'scripts', 'check-module-boundaries.js');
  const result = spawnSync(process.execPath, [script], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, STRICT_MODULE_BOUNDARIES: '1' },
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    assert.fail(result.stderr || result.stdout || 'check-module-boundaries failed');
  }
  assert.match(result.stdout, /OK/);
});
