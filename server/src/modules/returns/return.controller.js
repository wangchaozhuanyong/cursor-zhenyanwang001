const returnService = require('./return.service');
const { asyncRoute } = require('../../middleware/asyncRoute');

exports.getReturnRequests = asyncRoute(async (req, res) => {
  const result = await returnService.getReturnRequests(req.user.id, req.query);
  res.paginate(result.list, result.total, result.page, result.pageSize);
});

exports.getReturnById = asyncRoute(async (req, res) => {
  const result = await returnService.getReturnById(req.user.id, req.params.id);
  res.success(result.data);
});

exports.createReturn = asyncRoute(async (req, res) => {
  const result = await returnService.createReturn(req.user.id, req.body);
  res.success(result.data, result.message);
});
