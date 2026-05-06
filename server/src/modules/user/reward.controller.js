const rewardService = require('./reward.service');

exports.getRecords = async (req, res, next) => {
  try {
    const { list, total, page, pageSize } = await rewardService.getRecords(req.user.id, req.query);
    res.paginate(list, total, page, pageSize);
  } catch (err) { next(err); }
};

exports.withdraw = async (req, res, next) => {
  try {
    const result = await rewardService.withdraw(req.user.id, req.body);
    if (result.error) return res.fail(result.error.code, result.error.message);
    res.success(null, result.message);
  } catch (err) { next(err); }
};

exports.getBalance = async (req, res, next) => {
  try {
    const data = await rewardService.getBalance(req.user.id);
    res.success(data);
  } catch (err) { next(err); }
};
