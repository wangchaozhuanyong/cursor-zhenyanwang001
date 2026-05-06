const pointsService = require('./points.service');

exports.getRecords = async (req, res, next) => {
  try {
    const { list, total, page, pageSize } = await pointsService.getRecords(req.user.id, req.query);
    res.paginate(list, total, page, pageSize);
  } catch (err) { next(err); }
};

exports.getBalance = async (req, res, next) => {
  try {
    const data = await pointsService.getBalance(req.user.id);
    res.success(data);
  } catch (err) { next(err); }
};

exports.signIn = async (req, res, next) => {
  try {
    const result = await pointsService.signIn(req.user.id);
    if (result.error) return res.fail(result.error.code, result.error.message);
    res.success(result.data, result.message);
  } catch (err) { next(err); }
};
