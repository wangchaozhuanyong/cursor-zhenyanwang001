const historyService = require('./history.service');

exports.getHistory = async (req, res, next) => {
  try {
    const { list, total, page, pageSize } = await historyService.getHistory(req.user.id, req.query);
    res.paginate(list, total, page, pageSize);
  } catch (err) { next(err); }
};

exports.addHistory = async (req, res, next) => {
  try {
    const result = await historyService.addHistory(req.user.id, req.body);
    if (result.error) return res.fail(result.error.code, result.error.message);
    res.success(result.data, result.message);
  } catch (err) { next(err); }
};

exports.clearHistory = async (req, res, next) => {
  try {
    const { message } = await historyService.clearHistory(req.user.id);
    res.success(null, message);
  } catch (err) { next(err); }
};
