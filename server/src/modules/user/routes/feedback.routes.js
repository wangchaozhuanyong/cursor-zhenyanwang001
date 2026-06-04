const { Router } = require('express');
const auth = require('../../../middleware/auth');
const authOptional = require('../../../middleware/authOptional');
const { generalApiLimiter } = require('../../../middleware/rateLimiters');
const { validate } = require('../../../middleware/validate');
const ctrl = require('../controller/feedback.controller');
const { myFeedbackListQuerySchema, submitFeedbackBodySchema } = require('../schemas/feedback.schemas');

const router = Router();

router.get('/my', auth, generalApiLimiter, validate({ query: myFeedbackListQuerySchema }), ctrl.listMine);
router.post('/', authOptional, generalApiLimiter, validate({ body: submitFeedbackBodySchema }), ctrl.submit);

module.exports = router;
