const productStockRules = require('../rules/productStock.rules');
const orderPaymentRules = require('../rules/orderPayment.rules');
const refundRules = require('../rules/refund.rules');
const pointsRules = require('../rules/points.rules');
const orderStockRules = require('../rules/orderStock.rules');
const cacheRules = require('../rules/cache.rules');
const fileRules = require('../rules/file.rules');
const userStatsRules = require('../rules/userStats.rules');
const clientSecurityRules = require('../rules/clientSecurity.rules');
const systemHealthRules = require('../rules/systemHealth.rules');
const businessIntegrityRules = require('../rules/businessIntegrity.rules');

const registry = {
  ...productStockRules,
  ...orderPaymentRules,
  ...refundRules,
  ...pointsRules,
  ...orderStockRules,
  ...cacheRules,
  ...fileRules,
  ...userStatsRules,
  ...clientSecurityRules,
  ...systemHealthRules,
  ...businessIntegrityRules,
};

function getRuleRunner(code) {
  return registry[code] || null;
}

function hasRule(code) {
  return Boolean(getRuleRunner(code));
}

module.exports = {
  getRuleRunner,
  hasRule,
  ruleCodes: Object.keys(registry),
};
