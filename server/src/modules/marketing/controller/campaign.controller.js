const service = require('../service/campaign.service');
const { asyncRoute } = require('../../../middleware/asyncRoute');

function getCurrentUserContext(req) {
  return {
    userId: req.user?.id ? String(req.user.id) : null,
  };
}

exports.getHomeCampaigns = asyncRoute(async (req, res) => {
  const result = await service.getHomeCampaigns(req.query, getCurrentUserContext(req));
  res.success(result.data);
});

exports.getCampaignById = asyncRoute(async (req, res) => {
  const result = await service.getCampaignById(req.params.id, getCurrentUserContext(req));
  res.success(result.data);
});

exports.recordImpression = asyncRoute(async (req, res) => {
  const result = await service.recordCampaignEvent(req.params.id, 'impression', req.body || {}, req);
  res.success(result.data, result.message);
});

exports.recordClick = asyncRoute(async (req, res) => {
  const result = await service.recordCampaignEvent(req.params.id, 'click', req.body || {}, req);
  res.success(result.data, result.message);
});
