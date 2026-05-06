const favoritesService = require('./favorites.service');

exports.getFavorites = async (req, res, next) => {
  try {
    const { list, total, page, pageSize } = await favoritesService.getFavorites(req.user.id, req.query);
    res.paginate(list, total, page, pageSize);
  } catch (err) { next(err); }
};

exports.addFavorite = async (req, res, next) => {
  try {
    const result = await favoritesService.addFavorite(req.user.id, req.body);
    if (result.error) return res.fail(result.error.code, result.error.message);
    res.success(result.data, result.message);
  } catch (err) { next(err); }
};

exports.removeFavorite = async (req, res, next) => {
  try {
    const { message } = await favoritesService.removeFavorite(req.user.id, req.params.productId);
    res.success(null, message);
  } catch (err) { next(err); }
};

exports.checkFavorite = async (req, res, next) => {
  try {
    const data = await favoritesService.checkFavorite(req.user.id, req.params.productId);
    res.success(data);
  } catch (err) { next(err); }
};
