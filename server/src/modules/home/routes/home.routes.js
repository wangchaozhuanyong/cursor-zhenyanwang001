const { Router } = require('express');
const ctrl = require('../controller/home.controller');

const router = Router();

router.get('/home/bootstrap', ctrl.getBootstrap);
router.get('/home/bootstrap-lite', ctrl.getBootstrapLite);
router.get('/home/marketing', ctrl.getMarketing);

module.exports = router;
