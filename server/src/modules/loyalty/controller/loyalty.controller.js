const svc = require('../service/loyalty.service');

exports.getConfig = async (req, res, next) => {
  try {
    const r = await svc.getLoyaltyConfig();
    res.success(r.data);
  } catch (err) {
    next(err);
  }
};

