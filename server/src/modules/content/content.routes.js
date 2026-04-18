const { Router } = require('express');
const content = require('./content.controller');

const router = Router();

router.get('/site-info', content.siteInfo);
router.get('/:slug', content.pageBySlug);

module.exports = router;
