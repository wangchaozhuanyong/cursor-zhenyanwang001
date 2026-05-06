const { Router } = require('express');
const content = require('./content.controller');
const { validate } = require('../../middleware/validate');
const { contentSlugParamSchema } = require('./schemas/product.schemas');

const router = Router();

router.get('/site-info', content.siteInfo);
router.get('/:slug', validate({ params: contentSlugParamSchema }), content.pageBySlug);

module.exports = router;
