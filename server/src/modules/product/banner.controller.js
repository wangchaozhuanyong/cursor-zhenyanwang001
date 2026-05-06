const catalogService = require('./catalog.service');

exports.getBanners = async (req, res, next) => {
  try {
    const rows = await catalogService.getBanners();
    res.success(rows);
  } catch (err) { next(err); }
};
