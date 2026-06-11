const { Router } = require('express');
const service = require('./service/search.service');

const router = Router();
router.use('/search', require('./routes/search.routes'));

/** @type {any} */ (router).api = {
  listAdminSearchTerms: service.listAdminSearchTerms,
  saveAdminSearchTerm: service.saveAdminSearchTerm,
  updateAdminSearchTerm: service.updateAdminSearchTerm,
  removeAdminSearchTerm: service.removeAdminSearchTerm,
};

module.exports = router;
