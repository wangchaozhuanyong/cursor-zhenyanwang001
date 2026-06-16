const service = require('./service/search.service');

module.exports = {
  listAdminSearchTerms: service.listAdminSearchTerms,
  saveAdminSearchTerm: service.saveAdminSearchTerm,
  updateAdminSearchTerm: service.updateAdminSearchTerm,
  removeAdminSearchTerm: service.removeAdminSearchTerm,
};
