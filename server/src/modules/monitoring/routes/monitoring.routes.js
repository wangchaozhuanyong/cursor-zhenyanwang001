const { Router } = require('express');
const adminAuth = require('../../../middleware/adminAuth');
const controller = require('../controller/monitoring.controller');

const router = Router();
const requirePermission = adminAuth.requirePermission;
const requireAnyPermission = adminAuth.requireAnyPermission;

const canView = requireAnyPermission(['monitoring.view', 'monitoring.manage', 'monitoring.repair']);
const canManage = requireAnyPermission(['monitoring.manage', 'monitoring.repair']);

router.use(adminAuth);

router.get('/overview', canView, controller.getOverview);
router.get('/anomalies', canView, controller.listAnomalies);
router.get('/anomalies/:id', canView, controller.getAnomalyDetail);
router.post('/anomalies/:id/rescan', canManage, controller.rescanAnomaly);
router.post('/anomalies/:id/ignore', canManage, controller.ignoreAnomaly);
router.post('/anomalies/:id/resolve', canManage, controller.resolveAnomaly);
router.post('/anomalies/:id/create-repair-task', canManage, controller.createRepairTask);

router.get('/repair-tasks', canView, controller.listRepairTasks);
router.post('/repair-tasks/:id/approve', requirePermission('monitoring.repair'), controller.approveRepairTask);
router.post('/repair-tasks/:id/reject', requirePermission('monitoring.repair'), controller.rejectRepairTask);
router.post('/repair-tasks/:id/cancel', requirePermission('monitoring.repair'), controller.cancelRepairTask);
router.post('/repair-tasks/:id/execute', requirePermission('monitoring.repair'), controller.executeRepairTask);

router.get('/rules', canView, controller.listRules);
router.patch('/rules/:code', requirePermission('monitoring.manage'), controller.updateRule);
router.post('/rules/:code/run', canManage, controller.runRule);

router.get('/runs', canView, controller.listRuns);

module.exports = router;
