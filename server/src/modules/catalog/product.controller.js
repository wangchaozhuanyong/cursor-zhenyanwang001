const catalogService = require('./catalog.service');

exports.getProducts = async (req, res, next) => {
  try {
    const { list, total, page, pageSize } = await catalogService.getProducts(req.query);
    res.paginate(list, total, page, pageSize);
  } catch (err) { next(err); }
};

exports.getProductById = async (req, res, next) => {
  try {
    const data = await catalogService.getProductById(req.params.id);
    if (!data) return res.fail(404, '商品不存在');
    res.success(data);
  } catch (err) { next(err); }
};

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
