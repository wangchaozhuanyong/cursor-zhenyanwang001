const { Router } = require('express');
const { validate } = require('../../../middleware/validate');
const webhookCtrl = require('../controller/payments.webhook.controller');
const { webhookManualBodySchema, webhookProviderParamSchema } = require('../payments.schemas');

const router = Router();

router.post(
  '/webhooks/:provider',
  validate({ params: webhookProviderParamSchema, body: webhookManualBodySchema }),
  webhookCtrl.handleProviderWebhook,
);

module.exports = router;


