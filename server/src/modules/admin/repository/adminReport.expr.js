const schemaContract = require('../../../db/schemaContract');

module.exports = {
  getReportSchema: schemaContract.loadSchemaCapabilities,
  getReportExprs: schemaContract.getOrderRevenueExprs,
  invalidateReportExprsCache: schemaContract.invalidateSchemaCapabilitiesCache,
};
