const { Router } = require('express');
const ctrl = require('./seo.controller');

const router = Router();

router.get('/robots.txt', ctrl.robots);
router.get('/sitemap.xml', ctrl.sitemap);

module.exports = router;
