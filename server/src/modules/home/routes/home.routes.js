const { Router } = require('express');
const ctrl = require('../controller/home.controller');

const router = Router();

router.get('/home/bootstrap', ctrl.getBootstrap);

module.exports = router;
