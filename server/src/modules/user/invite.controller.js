const inviteService = require('./invite.service');

exports.getStats = async (req, res, next) => {
  try {
    const result = await inviteService.getStats(req.user.id);
    if (result.error) return res.fail(result.error.code, result.error.message);
    res.success(result);
  } catch (err) { next(err); }
};

exports.getRecords = async (req, res, next) => {
  try {
    const { list, total, page, pageSize } = await inviteService.getRecords(req.user.id, req.query);
    res.paginate(list, total, page, pageSize);
  } catch (err) { next(err); }
};
