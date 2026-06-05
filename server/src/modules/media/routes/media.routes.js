const { Router } = require('express');
const navIconThumbController = require('../controller/navIconThumb.controller');

const router = Router();

router.get('/media/nav-icon-thumb', navIconThumbController.getNavIconThumb);

module.exports = router;
