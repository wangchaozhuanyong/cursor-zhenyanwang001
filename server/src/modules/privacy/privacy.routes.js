const { Router } = require('express');
const { z } = require('zod');
const { validate } = require('../../middleware/validate');
const auth = require('../../middleware/auth');
const ctrl = require('./privacy.controller');

function optionalAuth(req, res, next) {
  if (!req.headers.authorization && !req.headers.cookie) return next();
  return auth(req, res, next);
}

const consentBodySchema = z.object({
  anonymous_id: z.string().trim().max(64).optional(),
  consent_version: z.string().trim().max(32).optional(),
  analytics_allowed: z.coerce.boolean().default(false),
  ads_allowed: z.coerce.boolean().default(false),
});

const consentQuerySchema = z.object({
  anonymous_id: z.string().trim().max(64).optional(),
});

const router = Router();

router.post('/consents', optionalAuth, validate({ body: consentBodySchema }), ctrl.recordConsent);
router.get('/consents/me', optionalAuth, validate({ query: consentQuerySchema }), ctrl.getMyConsent);

module.exports = router;
