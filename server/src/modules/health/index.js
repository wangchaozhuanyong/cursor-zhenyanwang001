/**
 * Health：存活与就绪探针
 */
const { Router } = require('express');

const router = Router();
router.use('/health', require('./routes/health.routes'));

module.exports = router;
