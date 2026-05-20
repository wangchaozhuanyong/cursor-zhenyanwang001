const { Router } = require('express');
const seoRoutes = require('./routes/seo.routes');
const seoController = require('./controller/seo.controller');

const router = Router();

router.use('/seo', seoRoutes);
router.get('/robots.txt', seoController.robots);
router.get('/sitemap.xml', seoController.sitemap);

module.exports = router;
