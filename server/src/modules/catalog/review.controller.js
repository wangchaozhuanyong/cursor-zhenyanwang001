const reviewService = require('./review.service');

exports.getProductReviews = async (req, res, next) => {
  try {
    const { list, total, page, pageSize } = await reviewService.getProductReviews(req);
    res.paginate(list, total, page, pageSize);
  } catch (err) { next(err); }
};

exports.toggleLike = async (req, res, next) => {
  try {
    const data = await reviewService.toggleLike(req.user.id, req.params.id);
    res.success(data);
  } catch (err) { next(err); }
};

exports.createReview = async (req, res, next) => {
  try {
    const result = await reviewService.createReview(req.user.id, req.body);
    if (result.error) return res.fail(result.error.code, result.error.message);
    res.success(result.data, result.message);
  } catch (err) { next(err); }
};
