const fs = require('fs');
const path = require('path');
const { expectedModules, requiredModuleDirs } = require('./architecture-rules');

const modulesRoot = path.resolve(__dirname, '..', 'src', 'modules');

function isDirectory(p) {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

function run() {
  if (!isDirectory(modulesRoot)) {
    console.error(`[check:module-structure] modules root not found: ${modulesRoot}`);
    process.exit(1);
  }

  const moduleNames = fs
    .readdirSync(modulesRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  const missing = [];
  const legacyLayerFiles = [];
  const missingModules = expectedModules.filter((name) => !moduleNames.includes(name));
  const unexpectedModules = moduleNames.filter((name) => !expectedModules.includes(name));

  if (missingModules.length > 0 || unexpectedModules.length > 0) {
    console.error('[check:module-structure] Backend module list does not match the fixed baseline:');
    for (const item of missingModules) console.error(`- missing module: ${item}`);
    for (const item of unexpectedModules) console.error(`- unexpected module: ${item}`);
    process.exit(1);
  }

  for (const moduleName of moduleNames) {
    const modulePath = path.join(modulesRoot, moduleName);
    if (!fs.existsSync(path.join(modulePath, 'index.js'))) {
      missing.push(`${moduleName}/index.js`);
    }
    for (const dir of requiredModuleDirs) {
      const target = path.join(modulePath, dir);
      if (!isDirectory(target)) {
        missing.push(`${moduleName}/${dir}`);
      }
    }

    const topFiles = fs
      .readdirSync(modulePath, { withFileTypes: true })
      .filter((d) => d.isFile())
      .map((d) => d.name);
    for (const fileName of topFiles) {
      if (
        fileName.endsWith('.routes.js') ||
        fileName.endsWith('.controller.js') ||
        fileName.endsWith('.service.js') ||
        fileName.endsWith('.repository.js')
      ) {
        legacyLayerFiles.push(`${moduleName}/${fileName}`);
      }
    }
  }

  if (missing.length > 0) {
    console.error('[check:module-structure] Missing required module layer directories:');
    for (const item of missing) console.error(`- ${item}`);
    process.exit(1);
  }

  if (legacyLayerFiles.length > 0) {
    console.warn('[check:module-structure] Legacy top-level layer files detected (migrate into routes/controller/service/repository):');
    for (const item of legacyLayerFiles) console.warn(`- ${item}`);
  }

  console.log(`[check:module-structure] OK (${moduleNames.length} modules)`);
}

run();
