const { Router } = require('express');
const ctrl = require('../controller/campaign.controller');
const authOptional = require('../../../middleware/authOptional');

const router = Router();

router.get('/home', authOptional, ctrl.getHomeCampaigns);
router.get('/:id', authOptional, ctrl.getCampaignById);
router.post('/:id/impression', authOptional, ctrl.recordImpression);
router.post('/:id/click', authOptional, ctrl.recordClick);

module.exports = router;
