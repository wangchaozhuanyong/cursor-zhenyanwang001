'use strict';

const path = require('path');
const { spawnSync } = require('child_process');
const { architectureChecks } = require('./architecture-rules');

let failed = false;

for (const check of architectureChecks) {
  const scriptPath = path.join(__dirname, check.script);
  console.log(`[check:architecture] running ${check.name}`);
  const result = spawnSync(process.execPath, [scriptPath], {
    cwd: path.resolve(__dirname, '..'),
    env: { ...process.env, ...(check.env || {}) },
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    failed = true;
    console.error(`[check:architecture] failed: ${check.name}`);
  }
}

if (failed) {
  process.exit(1);
}

console.log(`[check:architecture] OK (${architectureChecks.length} checks)`);
