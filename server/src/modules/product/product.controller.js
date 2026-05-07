const catalogService = require('./catalog.service');
const productApiService = require('./services/product.api.service');
const { asyncRoute } = require('../../middleware/asyncRoute');

exports.getProducts = asyncRoute(async (req, res) => {
  const { list, total, page, pageSize } = await productApiService.listProducts(req.query);
  res.paginate(list, total, page, pageSize);
});

exports.getProductById = asyncRoute(async (req, res) => {
  const data = await productApiService.getProductById(req.params.id);
  res.success(data);
});

exports.getHomeProducts = async (req, res, next) => {
  try {
    const data = await catalogService.getHomeProducts();
    res.success(data);
  } catch (err) { next(err); }
};

exports.getRelatedProducts = async (req, res, next) => {
  try {
    const list = await catalogService.getRelatedProducts(req.params.id, req.query.limit);
    res.success(list);
  } catch (err) { next(err); }
};

exports.trackHomeEvent = asyncRoute(async (req, res) => {
  await catalogService.trackHomeEngagement(req.body || {});
  res.success(null, 'ok');
});
