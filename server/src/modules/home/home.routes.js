const { Router } = require('express');
const ctrl = require('./home.controller');

const router = Router();

router.get('/home/bootstrap', ctrl.getBootstrap);

module.exports = router;
