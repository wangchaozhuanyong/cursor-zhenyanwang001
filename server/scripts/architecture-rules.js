'use strict';

const expectedModules = Object.freeze([
  'admin',
  'analytics',
  'auth',
  'cart',
  'dataRetention',
  'health',
  'home',
  'logistics',
  'loyalty',
  'marketing',
  'monitoring',
  'myinvois',
  'notification',
  'order',
  'payment',
  'privacy',
  'product',
  'pwa',
  'search',
  'seo',
  'siteCapabilities',
  'telegram',
  'theme',
  'user',
]);

const requiredModuleDirs = Object.freeze(['routes', 'controller', 'service', 'repository']);
const internalLayerDirs = Object.freeze(['controller', 'repository', 'routes', 'service', 'services']);

const architectureChecks = Object.freeze([
  { name: 'module structure', script: 'check-module-structure.js' },
  { name: 'service layer', script: 'check-service-layer.js' },
  {
    name: 'module boundaries',
    script: 'check-module-boundaries.js',
    env: { STRICT_MODULE_BOUNDARIES: '1' },
  },
]);

module.exports = {
  architectureChecks,
  expectedModules,
  internalLayerDirs,
  requiredModuleDirs,
};
