const { Router } = require('express');
const adminAuth = require('../../../middleware/adminAuth');
const controller = require('../controller/dataRetention.controller');

const router = Router();
const requirePermission = adminAuth.requirePermission;
const requireAnyPermission = adminAuth.requireAnyPermission;

const canView = requireAnyPermission(['data_cleanup.view', 'data_cleanup.manage', 'data_cleanup.execute']);
const requireRecentMfa = adminAuth.requireRecentMfa;

router.use(adminAuth);

router.get('/overview', canView, controller.overview);
router.get('/policies', canView, controller.listPolicies);
router.put('/policies/:key', requirePermission('data_cleanup.manage'), requireRecentMfa, controller.updatePolicy);
router.post('/policies/reset-defaults', requirePermission('data_cleanup.manage'), requireRecentMfa, controller.resetDefaults);
router.post('/preview', requirePermission('data_cleanup.execute'), requireRecentMfa, controller.preview);
router.post('/runs', requirePermission('data_cleanup.execute'), requireRecentMfa, controller.createRun);
router.get('/runs', canView, controller.listRuns);
router.get('/runs/:id', canView, controller.getRun);
router.post('/runs/:id/cancel', requirePermission('data_cleanup.execute'), requireRecentMfa, controller.cancelRun);

module.exports = router;
