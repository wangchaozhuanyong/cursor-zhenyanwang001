const { Router } = require('express');
const adminAuth = require('../../../middleware/adminAuth');
const requirePermission = adminAuth.requirePermission;
const { validate } = require('../../../middleware/validate');
const ctrl = require('../controller/myinvois.controller');
const schemas = require('../myinvois.schemas');

const router = Router();

router.get('/admin/myinvois/status', adminAuth, requirePermission('myinvois.manage'), ctrl.getStatus);
router.put(
  '/admin/myinvois/config',
  adminAuth,
  requirePermission('myinvois.manage'),
  validate({ body: schemas.profileBodySchema }),
  ctrl.updateProfile,
);
router.get(
  '/admin/myinvois/documents',
  adminAuth,
  requirePermission('myinvois.manage'),
  validate({ query: schemas.listDocumentsQuerySchema }),
  ctrl.listDocuments,
);
router.get(
  '/admin/myinvois/documents/:id',
  adminAuth,
  requirePermission('myinvois.manage'),
  validate({ params: schemas.idParamSchema }),
  ctrl.getDocument,
);
router.post(
  '/admin/myinvois/documents/:id/retry',
  adminAuth,
  requirePermission('myinvois.manage'),
  validate({ params: schemas.idParamSchema }),
  ctrl.retryDocument,
);
router.post(
  '/admin/myinvois/documents/:id/submit',
  adminAuth,
  requirePermission('myinvois.manage'),
  validate({ params: schemas.idParamSchema }),
  ctrl.submitDocument,
);
router.post(
  '/admin/myinvois/process-pending',
  adminAuth,
  requirePermission('myinvois.manage'),
  validate({ body: schemas.processPendingBodySchema }),
  ctrl.processPending,
);
router.post(
  '/admin/myinvois/reconciliations',
  adminAuth,
  requirePermission('myinvois.manage'),
  validate({ body: schemas.reconciliationBodySchema }),
  ctrl.createReconciliation,
);

module.exports = router;
